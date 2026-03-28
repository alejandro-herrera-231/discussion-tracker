import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
      "title": "Short topic name",
      "description": "1-2 sentence description of what was discussed on this topic",
      "importance": 7,
      "stances": [
        {
          "speakerLabel": "Speaker name exactly as given",
          "stance": "This speaker's position, opinion, or contribution on this topic"
        }
      ]
    }
  ]
}

Rules:
- importance is 1-10 (10 = dominated the conversation, 1 = briefly mentioned)
- Only include speakers in a topic's stances if they actually spoke about it
- Order topics by importance, highest first
- Return ONLY the JSON object, no other text, no markdown code blocks

Speakers in this discussion: ${speakerNames}

Transcript:
${transcript}`

  let message
  try {
    message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
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

  const data = JSON.parse(jsonMatch[0]) as {
    summary: string
    topics: {
      title: string
      description: string
      importance: number
      stances: { speakerLabel: string; stance: string }[]
    }[]
  }

  // Save to DB
  const analysis = await prisma.analysis.create({
    data: {
      recordingId: id,
      summary: data.summary,
      topics: {
        create: data.topics.map((t) => ({
          title: t.title,
          description: t.description,
          importance: t.importance,
          stances: {
            create: t.stances.flatMap((s) => {
              const speaker = recording.speakers.find((sp) => sp.label === s.speakerLabel)
              if (!speaker) return []
              return [{ speakerId: speaker.id, stance: s.stance }]
            }),
          },
        })),
      },
    },
  })

  return NextResponse.json({ id: analysis.id })
}
