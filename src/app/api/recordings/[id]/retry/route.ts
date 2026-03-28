import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AssemblyAI } from "assemblyai"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.user.id },
  })

  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!recording.audioPath) return NextResponse.json({ error: "No audio file" }, { status: 400 })

  // Reset status
  await prisma.recording.update({
    where: { id },
    data: { status: "PENDING", assemblyAiId: null },
  })

  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! })

  try {
    const uploadUrl = await client.files.upload(recording.audioPath)
    const transcript = await client.transcripts.submit({
      audio: uploadUrl,
      speaker_labels: true,
      speech_models: ["universal-2"],
      ...(recording.assemblyAiId === null && {}),
    })
    await prisma.recording.update({
      where: { id },
      data: { status: "PROCESSING", assemblyAiId: transcript.id },
    })
  } catch (err) {
    console.error("Retry error:", err)
    await prisma.recording.update({ where: { id }, data: { status: "ERROR" } })
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
