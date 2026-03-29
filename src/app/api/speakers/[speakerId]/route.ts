import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ speakerId: string }> }) {
  const { speakerId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { label } = await req.json()
  if (!label?.trim()) return NextResponse.json({ error: "Label required" }, { status: 400 })

  const speaker = await prisma.speaker.findUnique({
    where: { id: speakerId },
    include: { recording: true },
  })

  if (!speaker || speaker.recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.speaker.update({ where: { id: speakerId }, data: { label: label.trim() } })

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ speakerId: string }> }) {
  const { speakerId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const speaker = await prisma.speaker.findUnique({
    where: { id: speakerId },
    include: { recording: true, utterances: { take: 1 } },
  })

  if (!speaker || speaker.recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (speaker.utterances.length > 0) {
    return NextResponse.json(
      { error: "Reassign all utterances from this speaker before removing them." },
      { status: 400 }
    )
  }

  await prisma.speaker.delete({ where: { id: speakerId } })

  return NextResponse.json({ success: true })
}
