import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AssemblyAI } from "assemblyai"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.user.id },
  })

  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (recording.status !== "PROCESSING" || !recording.assemblyAiId) {
    return NextResponse.json({ status: recording.status })
  }

  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! })
  const result = await client.transcripts.get(recording.assemblyAiId)

  if (result.status === "error") {
    await prisma.recording.update({ where: { id }, data: { status: "ERROR" } })
    return NextResponse.json({ status: "ERROR" })
  }

  if (result.status !== "completed" || !result.utterances) {
    return NextResponse.json({ status: "PROCESSING" })
  }

  // Build speaker map (AssemblyAI uses "A", "B"... → Speaker 1, Speaker 2...)
  const speakerTotals = new Map<string, number>()
  for (const u of result.utterances) {
    speakerTotals.set(u.speaker, (speakerTotals.get(u.speaker) ?? 0) + (u.end - u.start))
  }

  const speakerIdMap = new Map<string, string>()
  let num = 1
  for (const [label, totalMs] of speakerTotals) {
    const speaker = await prisma.speaker.create({
      data: {
        recordingId: id,
        label: `Speaker ${num++}`,
        totalSpeakingTime: totalMs / 1000,
      },
    })
    speakerIdMap.set(label, speaker.id)
  }

  for (const u of result.utterances) {
    await prisma.utterance.create({
      data: {
        recordingId: id,
        speakerId: speakerIdMap.get(u.speaker)!,
        text: u.text,
        startMs: u.start,
        endMs: u.end,
      },
    })
  }

  await prisma.recording.update({
    where: { id },
    data: {
      status: "DONE",
      duration: result.audio_duration ?? null,
    },
  })

  return NextResponse.json({ status: "DONE" })
}
