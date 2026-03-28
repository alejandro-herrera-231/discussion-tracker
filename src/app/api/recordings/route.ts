import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AssemblyAI } from "assemblyai"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const audio = formData.get("audio") as File
  const title = (formData.get("title") as string) || "Untitled Discussion"
  const speakersExpected = formData.get("speakersExpected")
    ? parseInt(formData.get("speakersExpected") as string, 10)
    : undefined

  if (!audio) return NextResponse.json({ error: "No audio file" }, { status: 400 })

  // Save audio file to disk
  const bytes = await audio.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const uploadsDir = join(process.cwd(), "uploads")
  await mkdir(uploadsDir, { recursive: true })
  const filename = `${Date.now()}-${session.user.id}.webm`
  const filepath = join(uploadsDir, filename)
  await writeFile(filepath, buffer)

  // Create DB record
  const recording = await prisma.recording.create({
    data: { userId: session.user.id, title, status: "PENDING", audioPath: filepath },
  })

  // Submit to AssemblyAI (fire and forget — status updates via polling)
  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! })

  try {
    const uploadUrl = await client.files.upload(filepath)
    const transcript = await client.transcripts.submit({
      audio: uploadUrl,
      speaker_labels: true,
      speech_models: ["universal-2"],
      ...(speakersExpected !== undefined && { speakers_expected: speakersExpected }),
    })
    await prisma.recording.update({
      where: { id: recording.id },
      data: { status: "PROCESSING", assemblyAiId: transcript.id },
    })
  } catch (err) {
    console.error("AssemblyAI error:", err)
    await prisma.recording.update({
      where: { id: recording.id },
      data: { status: "ERROR" },
    })
  }

  return NextResponse.json({ id: recording.id })
}
