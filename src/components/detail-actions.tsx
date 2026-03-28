"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DetailActions({ id, showRetry }: { id: string; showRetry: boolean }) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  async function handleDelete() {
    if (!confirm("Delete this recording? This cannot be undone.")) return
    await fetch(`/api/recordings/${id}`, { method: "DELETE" })
    router.push("/discussions")
  }

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/recordings/${id}/retry`, { method: "POST" })
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      {showRetry && (
        <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
          <RotateCcw className="w-4 h-4 mr-2" />
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </div>
  )
}
