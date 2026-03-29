import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { label } = await req.json()
  if (!label?.trim()) return NextResponse.json({ error: "Label required" }, { status: 400 })

  const recording = await prisma.recording.findUnique({ where: { id, userId: session.user.id } })
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const speaker = await prisma.speaker.create({
    data: { recordingId: id, label: label.trim(), totalSpeakingTime: 0 },
  })

  return NextResponse.json(speaker)
}
