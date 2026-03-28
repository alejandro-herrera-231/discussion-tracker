import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { unlink } from "fs/promises"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.user.id },
  })

  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete audio file from disk
  if (recording.audioPath) {
    await unlink(recording.audioPath).catch(() => {})
  }

  // Delete from DB (speakers + utterances cascade automatically)
  await prisma.recording.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
