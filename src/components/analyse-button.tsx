"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Depth = "low" | "medium" | "high"

const DEPTHS: Depth[] = ["low", "medium", "high"]

const DEPTH_LABELS: Record<Depth, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

const DEPTH_DESCRIPTIONS: Record<Depth, string> = {
  low: "Broad themes only",
  medium: "Topics with sub-topics",
  high: "Detailed breakdown",
}

export function AnalyseButton({ recordingId, hasExisting = false, initialDepth = "medium" }: { recordingId: string; hasExisting?: boolean; initialDepth?: Depth }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [depth, setDepth] = useState<Depth>(initialDepth)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError("")
    const res = await fetch(`/api/recordings/${recordingId}/analyse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depth }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Analysis failed")
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  function handleAnalyseClick() {
    if (hasExisting && depth === initialDepth) {
      setConfirmOpen(true)
    } else {
      runAnalysis()
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {hasExisting && (
          <p className="text-xs text-muted-foreground text-right">
            Current analysis scope: <span className="font-medium text-foreground">{DEPTH_LABELS[initialDepth]}</span>
            <span className="text-muted-foreground"> — {DEPTH_DESCRIPTIONS[initialDepth]}</span>
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border p-1">
            {DEPTHS.map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                disabled={loading}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  depth === d
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {DEPTH_LABELS[d]}
              </button>
            ))}
          </div>
          <Button onClick={handleAnalyseClick} disabled={loading} variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? "Analysing…" : hasExisting ? "Re-analyse" : "Analyse discussion"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{DEPTH_DESCRIPTIONS[depth]}</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-analyse with the same scope?</DialogTitle>
            <DialogDescription>
              The current analysis already uses <span className="font-medium text-foreground">{DEPTH_LABELS[depth]}</span> scope ({DEPTH_DESCRIPTIONS[depth].toLowerCase()}). Re-analysing will replace the existing results.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                runAnalysis()
              }}
            >
              Re-analyse anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
