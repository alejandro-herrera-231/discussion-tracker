"use client"

import { useState } from "react"
import { List } from "lucide-react"
import { BubbleGraph } from "@/components/bubble-graph"
import { FactCheckPanel } from "@/components/fact-check-panel"

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

type Speaker = { id: string; label: string }
type TopicStance = { id: string; speakerId: string; stance: string; speaker: Speaker }
type FactCheckData = { results: string } | null
type SubTopic = { id: string; title: string; description: string; importance: number; stances: TopicStance[]; factCheck: FactCheckData }
type Topic = { id: string; title: string; description: string; importance: number; stances: TopicStance[]; factCheck: FactCheckData; children: SubTopic[] }
type Analysis = { summary: string; topics: Topic[] }

function parseFactCheck(fc: FactCheckData) {
  if (!fc) return null
  try { return JSON.parse(fc.results) } catch { return null }
}

function ImportanceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-4">{value}</span>
    </div>
  )
}

function StanceList({ stances, speakers }: { stances: TopicStance[]; speakers: Speaker[] }) {
  if (stances.length === 0) return null
  return (
    <div className="flex flex-col gap-2 pt-1 border-t">
      {stances.map((stance) => {
        const speakerIndex = speakers.findIndex((s) => s.id === stance.speakerId)
        return (
          <div key={stance.id} className="flex gap-3 items-start">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length]}`}>
              {stance.speaker.label}
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed">{stance.stance}</p>
          </div>
        )
      })}
    </div>
  )
}

export function AnalysisSection({
  analysis,
  speakers,
  hideSummary = false,
}: {
  analysis: Analysis
  speakers: Speaker[]
  hideSummary?: boolean
}) {
  const [view, setView] = useState<"topics" | "bubbles">("topics")

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      {!hideSummary && (
        <div className="rounded-xl border bg-muted/30 p-5 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Topics discussed</h3>
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button
            onClick={() => setView("topics")}
            className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors
              ${view === "topics" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setView("bubbles")}
            className={`px-3 py-1.5 flex items-center gap-1.5 border-l transition-colors
              ${view === "bubbles" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center text-base leading-none">◉</span>
            Bubbles
          </button>
        </div>
      </div>

      {view === "topics" ? (
        <div className="flex flex-col gap-3">
          {analysis.topics.map((topic) => (
            <div key={topic.id} className="rounded-xl border bg-muted/40 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <h4 className="font-semibold">{topic.title}</h4>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </div>
                <div className="w-24 shrink-0 pt-1">
                  <ImportanceBar value={topic.importance} />
                </div>
              </div>
              <StanceList stances={topic.stances} speakers={speakers} />
              {topic.stances.length > 0 && (
                <FactCheckPanel
                  topicId={topic.id}
                  speakers={speakers}
                  existing={parseFactCheck(topic.factCheck)}
                />
              )}

              {/* Sub-topics */}
              {topic.children.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-topics</p>
                  {topic.children.map((sub) => (
                    <div key={sub.id} className="rounded-lg border bg-muted/20 p-4 flex flex-col gap-2 ml-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-0.5 flex-1">
                          <h5 className="font-medium text-sm">{sub.title}</h5>
                          <p className="text-xs text-muted-foreground">{sub.description}</p>
                        </div>
                        <div className="w-20 shrink-0 pt-1">
                          <ImportanceBar value={sub.importance} />
                        </div>
                      </div>
                      <StanceList stances={sub.stances} speakers={speakers} />
                      {sub.stances.length > 0 && (
                        <FactCheckPanel
                          topicId={sub.id}
                          speakers={speakers}
                          existing={parseFactCheck(sub.factCheck)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <BubbleGraph topics={analysis.topics} speakers={speakers} />
      )}
    </div>
  )
}
