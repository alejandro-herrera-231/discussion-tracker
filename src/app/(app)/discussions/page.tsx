import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DiscussionsList } from "@/components/discussions-list"

export default async function DiscussionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/sign-in")

  const recordings = await prisma.recording.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { speakers: true },
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your discussions</h1>
        <Button asChild>
          <Link href="/dashboard">
            <Mic className="w-4 h-4 mr-2" />
            New recording
          </Link>
        </Button>
      </div>
      <DiscussionsList recordings={recordings} />
    </div>
  )
}
