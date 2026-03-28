import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { StatusPoller } from "@/components/status-poller"
import { DetailActions } from "@/components/detail-actions"
import { TranscriptSection } from "@/components/transcript-section"
import { EditableSpeakerCard } from "@/components/editable-speaker-card"
import { Loader2, ArrowLeft } from "lucide-react"

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function statusBadge(status: string) {
  switch (status) {
    case "DONE": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Done</Badge>
    case "PROCESSING": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>
    case "PENDING": return <Badge variant="secondary">Pending</Badge>
    case "ERROR": return <Badge variant="destructive">Error</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

export default async function DiscussionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/sign-in")

  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.user.id },
    include: {
      speakers: true,
      utterances: { orderBy: { startMs: "asc" }, include: { speaker: true } },
    },
  })

  if (!recording) notFound()

  const isProcessing = recording.status === "PENDING" || recording.status === "PROCESSING"

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link href="/discussions" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        All discussions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{recording.title}</h1>
          {recording.duration && (
            <p className="text-sm text-muted-foreground">Duration: {formatDuration(recording.duration)}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {statusBadge(recording.status)}
          <DetailActions id={id} showRetry={recording.status === "ERROR"} />
        </div>
      </div>

      {/* Auto-poll if still processing */}
      {isProcessing && <StatusPoller recordingId={id} />}

      {/* Processing state */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Transcription in progress — this usually takes 1–2 minutes.</p>
          <p className="text-sm">This page will update automatically.</p>
        </div>
      )}

      {/* Error state */}
      {recording.status === "ERROR" && (
        <div className="text-center py-12 text-destructive">
          <p>Transcription failed. Please try recording again.</p>
        </div>
      )}

      {/* Results */}
      {recording.status === "DONE" && (
        <>
          {/* Speaker summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recording.speakers.map((speaker, i) => (
              <EditableSpeakerCard key={speaker.id} speaker={speaker} index={i} />
            ))}
          </div>

          {/* Transcript */}
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold text-lg">Transcript
              <span className="text-sm font-normal text-muted-foreground ml-2">— click any line to edit</span>
            </h2>
            <TranscriptSection utterances={recording.utterances} speakers={recording.speakers} />
          </div>
        </>
      )}
    </div>
  )
}
