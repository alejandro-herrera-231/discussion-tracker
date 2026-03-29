"use client"

import { useState } from "react"
import { MessageSquareOff, XCircle, AlertTriangle, ChevronDown } from "lucide-react"
import { FactCheckAllButton } from "@/components/fact-check-all-button"
import { ContradictionsButton } from "@/components/contradictions-button"

export type InterruptionEntry = {
  interrupterId: string
  interrupterLabel: string
  interruptedId: string
  interruptedLabel: string
  count: number
  moments: { timeMs: number; interruptedText: string }[]
}
export type IncorrectFactEntry = { speakerId: string; speakerLabel: string; claim: string; assessment: string; topicTitle: string; isConcreteFact?: boolean }
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

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function interruptionColor(count: number, max: number): string {
  if (max === 0) return "text-muted-foreground"
  const ratio = count / max
  if (ratio >= 0.67) return "text-red-600"
  if (ratio >= 0.34) return "text-amber-600"
  return "text-green-600"
}

function MomentList({ moments }: { moments: { timeMs: number; interruptedText: string }[] }) {
  const [open, setOpen] = useState(false)
  if (moments.length === 0) return null
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "Hide moments" : `Show ${moments.length} moment${moments.length !== 1 ? "s" : ""}`}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {moments.map((m, i) => (
            <li key={i} className="text-sm text-muted-foreground pl-2 border-l border-border">
              <span className="font-mono text-muted-foreground/60 mr-1.5">{formatTime(m.timeMs)}</span>
              <span className="italic line-clamp-1">"{m.interruptedText}"</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, count, children }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="font-semibold text-base">{label}</span>
        {count !== null && (
          <span className="ml-auto text-3xl font-bold tabular-nums">{count}</span>
        )}
      </div>
      <div className="flex flex-col gap-3 pl-7">
        {children}
      </div>
    </div>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground italic">{children}</p>
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

  // Group interruptions by interrupter for parallel list display
  const byInterrupter = interruptions.reduce<Record<string, { label: string; entries: InterruptionEntry[] }>>((acc, e) => {
    if (!acc[e.interrupterId]) acc[e.interrupterId] = { label: e.interrupterLabel, entries: [] }
    acc[e.interrupterId].entries.push(e)
    return acc
  }, {})
  const maxCount = Math.max(0, ...interruptions.map((e) => e.count))
  const totalInterruptions = interruptions.reduce((s, e) => s + e.count, 0)

  return (
    <div className="flex flex-col divide-y">

      {/* Interruptions */}
      <div className="py-6 first:pt-0">
        <StatCard icon={MessageSquareOff} label="Interruptions" count={null}>
          {interruptions.length === 0 ? (
            <EmptyNote>No interruptions detected in this recording.</EmptyNote>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Object.keys(byInterrupter).length}, minmax(0, 1fr))` }}>
              {Object.values(byInterrupter).map(({ label, entries }) => {
                const personTotal = entries.reduce((s, e) => s + e.count, 0)
                return (
                  <div key={label} className="rounded-lg border bg-muted/20 p-4 flex flex-col gap-3">
                    <div className="flex flex-col">
                      <span className={`text-5xl font-bold tabular-nums leading-none ${interruptionColor(personTotal, Math.max(...Object.values(byInterrupter).map(({ entries: es }) => es.reduce((s, e) => s + e.count, 0))))}`}>
                        {personTotal}
                      </span>
                      <span className="text-base font-semibold mt-2 truncate">{label}</span>
                      <span className="text-sm text-muted-foreground">interruptions</span>
                    </div>
                    <div className="flex flex-col gap-2 border-t pt-3">
                      {entries.map((entry) => (
                        <div key={entry.interruptedId}>
                          <div className="flex items-baseline gap-1.5 text-sm">
                            <span className={`font-bold tabular-nums ${interruptionColor(entry.count, maxCount)}`}>×{entry.count}</span>
                            <span className="text-muted-foreground truncate">{entry.interruptedLabel}</span>
                          </div>
                          <MomentList moments={entry.moments} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </StatCard>
      </div>

      {/* Incorrect Facts */}
      <div className="py-6">
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
                  <div key={label} className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">{label}</span>
                    {facts.map((f, i) => (
                      <div key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-red-200">
                        <span className="italic">"{f.claim}"</span>
                        <span className="block text-muted-foreground/80 mt-1">in {f.topicTitle} — {f.assessment}</span>
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
                  <div key={label} className="flex flex-col gap-3">
                    <span className="text-sm font-semibold">{label}</span>
                    {items.map((c, i) => (
                      <div key={i} className="text-sm pl-3 border-l-2 border-amber-300 flex flex-col gap-1">
                        <span className="text-muted-foreground italic">"{c.statement1}"</span>
                        <span className="text-muted-foreground/70 text-center text-base leading-none">↕</span>
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
