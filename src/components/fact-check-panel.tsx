"use client"

import { useState } from "react"
import { ExternalLink, FlaskConical, RotateCcw, Loader2, ChevronDown, ChevronRight } from "lucide-react"

type Source = { title: string; url: string; excerpt: string }
type StanceVerdict = {
  speakerId: string
  speakerLabel: string
  claim: string
  verdict: "supported" | "contradicted" | "nuanced" | "unverifiable"
  assessment: string
  sources: Source[]
}

const VERDICT_STYLES: Record<StanceVerdict["verdict"], { label: string; classes: string }> = {
  supported:    { label: "Supported",    classes: "bg-green-100 text-green-800" },
  contradicted: { label: "Contradicted", classes: "bg-red-100 text-red-800" },
  nuanced:      { label: "Nuanced",      classes: "bg-amber-100 text-amber-800" },
  unverifiable: { label: "Unverifiable", classes: "bg-gray-100 text-gray-600" },
}

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

export function FactCheckPanel({
  topicId,
  speakers,
  existing,
}: {
  topicId: string
  speakers: { id: string; label: string }[]
  existing: { stanceVerdicts: StanceVerdict[] } | null
}) {
  const [results, setResults] = useState<StanceVerdict[] | null>(existing?.stanceVerdicts ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function runFactCheck() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/topics/${topicId}/factcheck`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Fact check failed")
      setResults(data.stanceVerdicts)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleHeaderClick() {
    if (results) {
      // Toggle open/closed
      setOpen((prev) => !prev)
    } else if (!loading) {
      // No results yet — run and open
      setOpen(true)
      runFactCheck()
    }
  }

  const hasResults = !!results

  return (
    <div className="flex flex-col border-t pt-2 gap-2">
      {/* Header row — always visible */}
      <button
        onClick={handleHeaderClick}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 w-fit"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : hasResults ? (
          open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <FlaskConical className="w-3.5 h-3.5" />
        )}
        {loading ? "Fact checking…" : hasResults ? "Fact check" : "Fact check this topic"}
        {hasResults && !loading && (
          <span className="ml-1 flex gap-0.5">
            {results.map((sv) => {
              const style = VERDICT_STYLES[sv.verdict] ?? VERDICT_STYLES.unverifiable
              return (
                <span key={sv.speakerId} className={`px-1.5 py-0 rounded-full text-[10px] font-semibold ${style.classes}`}>
                  {sv.speakerLabel.split(" ")[0]}
                </span>
              )
            })}
          </span>
        )}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Expanded results */}
      {open && results && (
        <div className="flex flex-col gap-3">
          {results.map((sv) => {
            const speakerIndex = speakers.findIndex((s) => s.id === sv.speakerId)
            const style = VERDICT_STYLES[sv.verdict] ?? VERDICT_STYLES.unverifiable
            return (
              <div key={sv.speakerId} className="rounded-lg border bg-background p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length]}`}>
                    {sv.speakerLabel}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.classes}`}>
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic">"{sv.claim}"</p>
                <p className="text-sm leading-relaxed">{sv.assessment}</p>
                {sv.sources.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sources</p>
                    {sv.sources.map((src, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {src.title}
                        </a>
                        {src.excerpt && (
                          <p className="text-xs text-muted-foreground leading-relaxed ml-4">{src.excerpt}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <button
            onClick={runFactCheck}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Re-check
          </button>
        </div>
      )}
    </div>
  )
}
