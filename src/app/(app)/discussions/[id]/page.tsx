import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { StatusPoller } from "@/components/status-poller"
import { DetailActions } from "@/components/detail-actions"
import { DiscussionView } from "@/components/discussion-view"
import { EditableSpeakerCard } from "@/components/editable-speaker-card"
import { AnalysisSection } from "@/components/analysis-section"
import { AnalyseButton } from "@/components/analyse-button"
import { CollapsibleBlock } from "@/components/collapsible-block"
import { SpeakerPieChart } from "@/components/speaker-pie-chart"
import { StatisticsSection } from "@/components/statistics-section"
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

export default async function DiscussionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/sign-in")

  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.user.id },
    include: {
      speakers: true,
      utterances: { orderBy: { startMs: "asc" }, include: { speaker: true } },
      analysis: {
        include: {
          topics: {
            where: { parentId: null },
            orderBy: { importance: "desc" },
            include: {
              stances: { include: { speaker: true } },
              factCheck: true,
              children: {
                orderBy: { importance: "desc" },
                include: { stances: { include: { speaker: true } }, factCheck: true },
              },
            },
          },
        },
      },
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
        <div className="flex flex-col">
          {/* Block 1 — Summary */}
          <CollapsibleBlock title="Summary" icon="clock" color="seagreen" defaultOpen={true}>
            <div className="flex flex-col gap-4">
              {recording.analysis && (
                <div className="rounded-xl border p-4 flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                  <p className="text-sm leading-relaxed">{recording.analysis.summary}</p>
                </div>
              )}
              <div className="flex items-center">
                <div className="flex flex-col gap-2 w-1/3">
                  {recording.speakers.map((speaker, i) => (
                    <EditableSpeakerCard key={speaker.id} speaker={speaker} index={i} />
                  ))}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <SpeakerPieChart speakers={recording.speakers} />
                </div>
              </div>
            </div>
          </CollapsibleBlock>

          <hr className="border-border my-2" />

          {/* Block 2 — Topics Discussed */}
          <CollapsibleBlock title="Topics Discussed" icon="bar-chart" color="cobalt" defaultOpen={true}>
            {recording.analysis
              ? <AnalysisSection analysis={recording.analysis} speakers={recording.speakers} hideSummary={true} />
              : <p className="text-sm text-muted-foreground">No analysis yet — run analysis to see topics.</p>
            }
          </CollapsibleBlock>

          <div className="flex justify-end py-2">
            <AnalyseButton recordingId={id} hasExisting={!!recording.analysis} />
          </div>

          <hr className="border-border my-2" />

          {/* Block 3 — Transcript & Timeline */}
          <CollapsibleBlock title="Transcript & Timeline" icon="file-text" color="ivory" defaultOpen={true}>
            <DiscussionView
              utterances={recording.utterances}
              speakers={recording.speakers}
              totalDuration={recording.duration ?? (Math.max(...recording.utterances.map(u => u.endMs)) / 1000)}
            />
          </CollapsibleBlock>

          <hr className="border-border my-2" />

          {/* Block 4 — Statistics */}
          <CollapsibleBlock title="Statistics" icon="trending-up" color="gold" defaultOpen={false}>
            <StatisticsSection />
          </CollapsibleBlock>
        </div>
      )}
    </div>
  )
}
