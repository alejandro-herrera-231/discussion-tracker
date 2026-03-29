import { MessageSquareOff, XCircle, AlertTriangle } from "lucide-react"
import { FactCheckAllButton } from "@/components/fact-check-all-button"
import { ContradictionsButton } from "@/components/contradictions-button"

export type InterruptionEntry = { speakerId: string; speakerLabel: string; count: number }
export type IncorrectFactEntry = { speakerId: string; speakerLabel: string; claim: string; assessment: string; topicTitle: string }
export type ContradictionEntry = { speakerId: string; speakerLabel: string; statement1: string; statement2: string; explanation: string }

type Props = {
  interruptions: InterruptionEntry[]
  incorrectFacts: IncorrectFactEntry[]
  contradictions: ContradictionEntry[] | null  // null = not yet analysed
  uncheckedTopicIds: string[]
  allTopicIds: string[]
  hasAnalysis: boolean
  recordingId: string
}

function StatCard({ icon: Icon, label, count, children }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-sm">{label}</span>
        {count !== null && (
          <span className="ml-auto text-2xl font-bold tabular-nums">{count}</span>
        )}
      </div>
      <div className="flex flex-col gap-2 pl-6">
        {children}
      </div>
    </div>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground italic">{children}</p>
}

export function StatisticsSection({
  interruptions,
  incorrectFacts,
  contradictions,
  uncheckedTopicIds,
  allTopicIds,
  hasAnalysis,
  recordingId,
}: Props) {
  // Group incorrect facts by speaker
  const factsBySpeaker = incorrectFacts.reduce<Record<string, { label: string; facts: IncorrectFactEntry[] }>>((acc, f) => {
    if (!acc[f.speakerId]) acc[f.speakerId] = { label: f.speakerLabel, facts: [] }
    acc[f.speakerId].facts.push(f)
    return acc
  }, {})

  // Group contradictions by speaker
  const contradictionsBySpeaker = (contradictions ?? []).reduce<Record<string, { label: string; items: ContradictionEntry[] }>>((acc, c) => {
    if (!acc[c.speakerId]) acc[c.speakerId] = { label: c.speakerLabel, items: [] }
    acc[c.speakerId].items.push(c)
    return acc
  }, {})

  return (
    <div className="flex flex-col divide-y">

      {/* Interruptions */}
      <div className="py-4 first:pt-0">
        <StatCard icon={MessageSquareOff} label="Interruptions" count={interruptions.reduce((s, i) => s + i.count, 0)}>
          {interruptions.length === 0 ? (
            <EmptyNote>No interruptions detected in this recording.</EmptyNote>
          ) : (
            interruptions.map((entry) => (
              <div key={entry.speakerId} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{entry.speakerLabel}</span>
                <span className="text-muted-foreground">interrupted {entry.count} {entry.count === 1 ? "time" : "times"}</span>
              </div>
            ))
          )}
        </StatCard>
      </div>

      {/* Incorrect Facts */}
      <div className="py-4">
        <StatCard icon={XCircle} label="Incorrect Facts" count={incorrectFacts.length}>
          {!hasAnalysis ? (
            <EmptyNote>Run analysis to identify incorrect facts.</EmptyNote>
          ) : (
            <div className="flex flex-col gap-2">
              {incorrectFacts.length === 0 ? (
                <EmptyNote>
                  {uncheckedTopicIds.length > 0
                    ? `${uncheckedTopicIds.length} topic${uncheckedTopicIds.length !== 1 ? "s" : ""} not yet fact-checked.`
                    : "No contradicted facts found across all fact-checked topics."}
                </EmptyNote>
              ) : (
                Object.values(factsBySpeaker).map(({ label, facts }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold">{label}</span>
                    {facts.map((f, i) => (
                      <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-red-200">
                        <span className="italic">"{f.claim}"</span>
                        <span className="block text-muted-foreground/80 mt-0.5">in {f.topicTitle} — {f.assessment}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
              <div className="flex gap-2 flex-wrap pt-1">
                {uncheckedTopicIds.length > 0 && (
                  <FactCheckAllButton
                    topicIds={uncheckedTopicIds}
                    label={`Fact Check All (${uncheckedTopicIds.length} remaining)`}
                  />
                )}
                {allTopicIds.length > 0 && uncheckedTopicIds.length === 0 && (
                  <FactCheckAllButton
                    topicIds={allTopicIds}
                    label="Re-check All Facts"
                  />
                )}
              </div>
            </div>
          )}
        </StatCard>
      </div>

      {/* Contradictions */}
      <div className="py-4 last:pb-0">
        <StatCard icon={AlertTriangle} label="Contradictions" count={contradictions?.length ?? null}>
          {!hasAnalysis ? (
            <EmptyNote>Run analysis before checking for contradictions.</EmptyNote>
          ) : (
            <div className="flex flex-col gap-3">
              {contradictions === null ? (
                <EmptyNote>Contradiction analysis has not been run yet.</EmptyNote>
              ) : contradictions.length === 0 ? (
                <EmptyNote>No clear contradictions found in this discussion.</EmptyNote>
              ) : (
                Object.values(contradictionsBySpeaker).map(({ label, items }) => (
                  <div key={label} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold">{label}</span>
                    {items.map((c, i) => (
                      <div key={i} className="text-xs pl-2 border-l-2 border-amber-300 flex flex-col gap-0.5">
                        <span className="text-muted-foreground italic">"{c.statement1}"</span>
                        <span className="text-muted-foreground/70 text-center leading-none">↕</span>
                        <span className="text-muted-foreground italic">"{c.statement2}"</span>
                        <span className="text-muted-foreground/80 mt-0.5">{c.explanation}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
              <ContradictionsButton recordingId={recordingId} hasExisting={contradictions !== null} />
            </div>
          )}
        </StatCard>
      </div>

    </div>
  )
}
