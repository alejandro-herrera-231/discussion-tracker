"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AnalyseButton({ recordingId, hasExisting = false }: { recordingId: string; hasExisting?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAnalyse() {
    setLoading(true)
    setError("")
    const res = await fetch(`/api/recordings/${recordingId}/analyse`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Analysis failed")
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleAnalyse} disabled={loading} variant="outline">
        <Sparkles className="w-4 h-4 mr-2" />
        {loading ? "Analysing…" : hasExisting ? "Re-analyse" : "Analyse discussion"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
