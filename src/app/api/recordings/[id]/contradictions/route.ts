import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  if (!recording || recording.status !== "DONE") return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!recording.analysis) return NextResponse.json({ error: "No analysis yet" }, { status: 400 })

  const transcript = recording.utterances
    .map((u) => `${u.speaker.label}: ${u.text}`)
    .join("\n")

  const speakerList = recording.speakers
    .map((s) => `- "${s.label}"`)
    .join("\n")

  let message
  try {
    message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Analyze this conversation transcript for contradictions. A contradiction is when a speaker makes a claim that conflicts with something they said earlier in the conversation, or directly conflicts with a factual assertion made by another speaker that they appeared to agree with.

Speakers:
${speakerList}

Transcript:
${transcript}

Return ONLY a valid JSON array of clear contradictions. If none exist, return [].

[
  {
    "speakerLabel": "exact speaker label from transcript",
    "statement1": "first statement (brief quote or close paraphrase)",
    "statement2": "contradicting statement (brief quote or close paraphrase)",
    "explanation": "1-2 sentences explaining why these contradict each other"
  }
]

Only include clear, direct contradictions — not mere differences of opinion or nuance. Return ONLY the JSON array.`,
      }],
    })
  } catch (err) {
    console.error("Anthropic contradictions error:", err)
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 })
  }

  const raw = message.content[0]
  if (raw.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 })

  const match = raw.text.match(/\[[\s\S]*\]/)
  const parsed = match ? (JSON.parse(match[0]) as { speakerLabel: string; statement1: string; statement2: string; explanation: string }[]) : []

  // Map speaker labels to IDs
  const labelToId = Object.fromEntries(recording.speakers.map((s) => [s.label, s.id]))
  const contradictions = parsed.map((c) => ({
    speakerId: labelToId[c.speakerLabel] ?? "",
    speakerLabel: c.speakerLabel,
    statement1: c.statement1,
    statement2: c.statement2,
    explanation: c.explanation,
  }))

  await prisma.analysis.update({
    where: { id: recording.analysis.id },
    data: { contradictions: JSON.stringify(contradictions) },
  })

  return NextResponse.json({ contradictions })
}
