"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ScanSearch, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ContradictionsButton({ recordingId, hasExisting = false }: { recordingId: string; hasExisting?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleClick() {
    setLoading(true)
    setError("")
    const res = await fetch(`/api/recordings/${recordingId}/contradictions`, { method: "POST" })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Analysis failed")
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading} className="gap-2 self-start">
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analysing…
          </>
        ) : (
          <>
            <ScanSearch className="w-3.5 h-3.5" />
            {hasExisting ? "Re-analyse Contradictions" : "Analyse Contradictions"}
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
