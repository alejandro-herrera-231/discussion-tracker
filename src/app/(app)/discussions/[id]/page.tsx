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
import { AddSpeakerCard } from "@/components/add-speaker-card"
import { CollapsibleBlock } from "@/components/collapsible-block"
import { SpeakerPieChart } from "@/components/speaker-pie-chart"
import { StatisticsSection, type InterruptionEntry, type IncorrectFactEntry, type ContradictionEntry } from "@/components/statistics-section"
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

// Interruption threshold: speaker changes within 300ms are treated as quick cutoffs.
// AssemblyAI diarized transcripts are sequential (no overlapping timestamps), so we
// use a gap-based heuristic. 300ms catches genuine rapid jumps without flagging
// normal conversational turn-taking pauses (~500ms+).
const INTERRUPTION_GAP_MS = 300

type Utterance = { speakerId: string; speaker: { label: string }; startMs: number; endMs: number }

function computeInterruptions(utterances: Utterance[]): InterruptionEntry[] {
  const sorted = [...utterances].sort((a, b) => a.startMs - b.startMs)
  const counts: Record<string, { label: string; count: number }> = {}
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const gap = curr.startMs - prev.endMs
    if (prev.speakerId !== curr.speakerId && gap < INTERRUPTION_GAP_MS) {
      if (!counts[curr.speakerId]) counts[curr.speakerId] = { label: curr.speaker.label, count: 0 }
      counts[curr.speakerId].count++
    }
  }
  return Object.entries(counts).map(([speakerId, { label, count }]) => ({ speakerId, speakerLabel: label, count }))
}

type FactCheckData = { results: string } | null
type TopicWithFactCheck = { id: string; title: string; stances: { id: string }[]; factCheck: FactCheckData; children: { id: string; title: string; stances: { id: string }[]; factCheck: FactCheckData }[] }

function computeIncorrectFacts(topics: TopicWithFactCheck[]): IncorrectFactEntry[] {
  const facts: IncorrectFactEntry[] = []
  function processFactCheck(factCheck: FactCheckData, topicTitle: string) {
    if (!factCheck) return
    try {
      const parsed = JSON.parse(factCheck.results) as { stanceVerdicts: { speakerId: string; speakerLabel: string; claim: string; verdict: string; assessment: string }[] }
      for (const sv of parsed.stanceVerdicts) {
        if (sv.verdict === "contradicted") {
          facts.push({ speakerId: sv.speakerId, speakerLabel: sv.speakerLabel, claim: sv.claim, assessment: sv.assessment, topicTitle })
        }
      }
    } catch {}
  }
  for (const topic of topics) {
    processFactCheck(topic.factCheck, topic.title)
    for (const child of topic.children) processFactCheck(child.factCheck, child.title)
  }
  return facts
}

function getUncheckedTopicIds(topics: TopicWithFactCheck[]): string[] {
  const ids: string[] = []
  for (const topic of topics) {
    if (topic.stances.length > 0 && !topic.factCheck) ids.push(topic.id)
    for (const child of topic.children) {
      if (child.stances.length > 0 && !child.factCheck) ids.push(child.id)
    }
  }
  return ids
}

function getAllTopicIds(topics: TopicWithFactCheck[]): string[] {
  const ids: string[] = []
  for (const topic of topics) {
    if (topic.stances.length > 0) ids.push(topic.id)
    for (const child of topic.children) {
      if (child.stances.length > 0) ids.push(child.id)
    }
  }
  return ids
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

  // Compute statistics
  const interruptions = computeInterruptions(recording.utterances)
  const incorrectFacts = recording.analysis ? computeIncorrectFacts(recording.analysis.topics) : []
  const uncheckedTopicIds = recording.analysis ? getUncheckedTopicIds(recording.analysis.topics) : []
  const allTopicIds = recording.analysis ? getAllTopicIds(recording.analysis.topics) : []
  const contradictions: ContradictionEntry[] | null = recording.analysis?.contradictions
    ? (() => { try { return JSON.parse(recording.analysis!.contradictions!) } catch { return null } })()
    : recording.analysis ? null : null

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
                  <AddSpeakerCard recordingId={id} />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <SpeakerPieChart speakers={recording.speakers} />
                </div>
              </div>
            </div>
          </CollapsibleBlock>

          <hr className="border-border my-5" />

          {/* Block 2 — Topics Discussed */}
          <CollapsibleBlock title="Topics Discussed" icon="bar-chart" color="cobalt" defaultOpen={true}>
            {recording.analysis
              ? <AnalysisSection analysis={recording.analysis} speakers={recording.speakers} hideSummary={true} />
              : <p className="text-sm text-muted-foreground">No analysis yet — run analysis to see topics.</p>
            }
          </CollapsibleBlock>

          <div className="flex justify-end py-2">
            <AnalyseButton recordingId={id} hasExisting={!!recording.analysis} initialDepth={(recording.analysis?.depth as "low" | "medium" | "high") ?? "medium"} />
          </div>

          <hr className="border-border my-5" />

          {/* Block 3 — Transcript & Timeline */}
          <CollapsibleBlock title="Transcript & Timeline" icon="file-text" color="ivory" defaultOpen={true}>
            <DiscussionView
              utterances={recording.utterances}
              speakers={recording.speakers}
              totalDuration={recording.duration ?? (Math.max(...recording.utterances.map(u => u.endMs)) / 1000)}
            />
          </CollapsibleBlock>

          <hr className="border-border my-5" />

          {/* Block 4 — Statistics */}
          <CollapsibleBlock title="Statistics" icon="trending-up" color="gold" defaultOpen={false}>
            <StatisticsSection
              interruptions={interruptions}
              incorrectFacts={incorrectFacts}
              contradictions={contradictions}
              uncheckedTopicIds={uncheckedTopicIds}
              allTopicIds={allTopicIds}
              hasAnalysis={!!recording.analysis}
              recordingId={id}
            />
          </CollapsibleBlock>
        </div>
      )}
    </div>
  )
}
