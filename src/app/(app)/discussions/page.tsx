import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecordingListActions } from "@/components/recording-list-actions"

function statusBadge(status: string) {
  switch (status) {
    case "DONE": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Done</Badge>
    case "PROCESSING": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>
    case "PENDING": return <Badge variant="secondary">Pending</Badge>
    case "ERROR": return <Badge variant="destructive">Error</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}

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

      {recordings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>No discussions yet.</p>
          <p className="text-sm mt-1">Start a new recording to get going.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recordings.map((r) => (
            <Link key={r.id} href={`/discussions/${r.id}`}>
              <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</span>
                    {r.speakers.length > 0 && (
                      <span className="text-sm text-muted-foreground">{r.speakers.length} speaker{r.speakers.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(r.status)}
                    <RecordingListActions id={r.id} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
