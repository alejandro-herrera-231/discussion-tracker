import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recalculateSpeakingTimes } from "@/lib/recalculate-speaking-times"

export async function PATCH(req: Request, { params }: { params: Promise<{ utteranceId: string }> }) {
  const { utteranceId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { speakerId } = await req.json()

  const utterance = await prisma.utterance.findUnique({
    where: { id: utteranceId },
    include: { recording: true },
  })

  if (!utterance || utterance.recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.utterance.update({ where: { id: utteranceId }, data: { speakerId } })
  await recalculateSpeakingTimes(utterance.recordingId)

  return NextResponse.json({ success: true })
}
