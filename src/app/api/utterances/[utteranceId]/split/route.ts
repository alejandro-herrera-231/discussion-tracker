import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recalculateSpeakingTimes } from "@/lib/recalculate-speaking-times"

export async function POST(req: Request, { params }: { params: Promise<{ utteranceId: string }> }) {
  const { utteranceId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { wordIndex, speaker1Id, speaker2Id } = await req.json()

  const utterance = await prisma.utterance.findUnique({
    where: { id: utteranceId },
    include: { recording: true },
  })

  if (!utterance || utterance.recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const words = utterance.text.trim().split(/\s+/)
  if (wordIndex <= 0 || wordIndex >= words.length) {
    return NextResponse.json({ error: "Invalid split point" }, { status: 400 })
  }

  const part1Text = words.slice(0, wordIndex).join(" ")
  const part2Text = words.slice(wordIndex).join(" ")

  // Proportional timestamp split
  const totalDuration = utterance.endMs - utterance.startMs
  const part1End = utterance.startMs + Math.round((wordIndex / words.length) * totalDuration)

  await prisma.$transaction([
    prisma.utterance.create({
      data: {
        recordingId: utterance.recordingId,
        speakerId: speaker1Id,
        text: part1Text,
        startMs: utterance.startMs,
        endMs: part1End,
      },
    }),
    prisma.utterance.create({
      data: {
        recordingId: utterance.recordingId,
        speakerId: speaker2Id,
        text: part2Text,
        startMs: part1End,
        endMs: utterance.endMs,
      },
    }),
    prisma.utterance.delete({ where: { id: utteranceId } }),
  ])

  await recalculateSpeakingTimes(utterance.recordingId)

  return NextResponse.json({ success: true })
}
