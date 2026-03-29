import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WebP images are allowed" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 400 })
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const filename = `${session.user.id}.${ext}`
  const avatarsDir = path.join(process.cwd(), "public", "avatars")

  await mkdir(avatarsDir, { recursive: true })
  await writeFile(path.join(avatarsDir, filename), Buffer.from(await file.arrayBuffer()))

  const imageUrl = `/avatars/${filename}`
  await prisma.user.update({ where: { id: session.user.id }, data: { image: imageUrl } })

  return NextResponse.json({ image: imageUrl })
}
