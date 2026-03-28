import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DEPTH_INSTRUCTIONS = {
  low: `- Identify only 3–5 broad, high-level themes. Do NOT create any subTopics — return an empty array [] for every topic's subTopics field.
- Keep topic descriptions concise (1 sentence each).`,
  medium: `- Identify 4–8 topics. Each may have 1–3 subTopics where the conversation genuinely broke into distinct sub-discussions.
- Only add subTopics when they add meaningful detail beyond the parent topic.`,
  high: `- Identify as many distinct topics as the conversation warrants (no upper limit).
- Every main topic should have 2–5 specific subTopics that capture finer-grained points or disagreements.
- Stances at the sub-topic level should be more precise than at the parent level.`,
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const depth: keyof typeof DEPTH_INSTRUCTIONS =
    body.depth && body.depth in DEPTH_INSTRUCTIONS ? body.depth : "medium"
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.user.id },
    include: {
      speakers: true,
      utterances: { orderBy: { startMs: "asc" }, include: { speaker: true } },
      analysis: true,
    },
  })

  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (recording.status !== "DONE") return NextResponse.json({ error: "Transcript not ready" }, { status: 400 })
  // Delete existing analysis if present so we can replace it
  if (recording.analysis) {
    await prisma.analysis.delete({ where: { id: recording.analysis.id } })
  }

  const speakerNames = recording.speakers.map((s) => s.label).join(", ")
  const transcript = recording.utterances
    .map((u) => `${u.speaker.label}: ${u.text}`)
    .join("\n")

  const prompt = `Analyse the following discussion transcript and return ONLY a valid JSON object with this exact structure:

{
  "summary": "A natural conversational summary of the discussion. Mention speakers by name. 1 sentence for short conversations, up to 4 for very long ones.",
  "topics": [
    {
      "title": "Short main topic name",
      "description": "1-2 sentence description of what was discussed on this topic",
      "importance": 7,
      "stances": [
        {
          "speakerLabel": "Speaker name exactly as given",
          "stance": "This speaker's position, opinion, or contribution on this topic"
        }
      ],
      "subTopics": [
        {
          "title": "Short sub-topic name",
          "description": "1-2 sentence description of this specific sub-topic",
          "importance": 5,
          "stances": [
            {
              "speakerLabel": "Speaker name exactly as given",
              "stance": "This speaker's position on this sub-topic"
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- importance is 1-10 (10 = dominated the conversation, 1 = briefly mentioned)
- Only include speakers in stances if they actually spoke about that topic/sub-topic
- Order topics by importance, highest first
- subTopics should each have their own stances reflecting each speaker's specific position on that sub-topic
- Return ONLY the JSON object, no other text, no markdown code blocks

Depth instructions (follow these strictly):
${DEPTH_INSTRUCTIONS[depth]}

Speakers in this discussion: ${speakerNames}

Transcript:
${transcript}`

  let message
  try {
    message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (err) {
    console.error("Anthropic API error:", err)
    return NextResponse.json({ error: "AI analysis failed. Check your API credits." }, { status: 500 })
  }

  const raw = message.content[0]
  if (raw.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 })

  const jsonMatch = raw.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: "Could not parse response" }, { status: 500 })

  type StanceData = { speakerLabel: string; stance: string }
  type SubTopicData = { title: string; description: string; importance: number; stances: StanceData[] }
  type TopicData = { title: string; description: string; importance: number; stances: StanceData[]; subTopics?: SubTopicData[] }
  const data = JSON.parse(jsonMatch[0]) as { summary: string; topics: TopicData[] }

  function buildStances(stances: StanceData[]) {
    return stances.flatMap((s) => {
      const speaker = recording.speakers.find((sp) => sp.label === s.speakerLabel)
      if (!speaker) return []
      return [{ speakerId: speaker.id, stance: s.stance }]
    })
  }

  // Two-pass save: create analysis + main topics first, then sub-topics with parentId
  const analysis = await prisma.analysis.create({
    data: {
      recordingId: id,
      summary: data.summary,
      depth,
      topics: {
        create: data.topics.map((t) => ({
          title: t.title,
          description: t.description,
          importance: t.importance,
          stances: { create: buildStances(t.stances) },
        })),
      },
    },
    include: { topics: true },
  })

  // Create sub-topics referencing their parent IDs
  for (const topicData of data.topics) {
    if (!topicData.subTopics?.length) continue
    const savedParent = analysis.topics.find((t) => t.title === topicData.title)
    if (!savedParent) continue
    await prisma.topic.createMany({
      data: topicData.subTopics.map((sub) => ({
        analysisId: analysis.id,
        parentId: savedParent.id,
        title: sub.title,
        description: sub.description,
        importance: sub.importance,
      })),
    })
    // Create stances for sub-topics
    const savedSubs = await prisma.topic.findMany({ where: { parentId: savedParent.id } })
    for (const subData of topicData.subTopics) {
      const savedSub = savedSubs.find((s) => s.title === subData.title)
      if (!savedSub) continue
      const stances = buildStances(subData.stances)
      if (stances.length > 0) {
        await prisma.topicStance.createMany({ data: stances.map((s) => ({ ...s, topicId: savedSub.id })) })
      }
    }
  }

  return NextResponse.json({ id: analysis.id })
}
