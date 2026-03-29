"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FactCheckAllButton({
  topicIds,
  label,
}: {
  topicIds: string[]
  label: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(0)

  async function handleClick() {
    setLoading(true)
    setDone(0)
    for (const topicId of topicIds) {
      await fetch(`/api/topics/${topicId}/factcheck`, { method: "POST" })
      setDone((n) => n + 1)
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading} className="gap-2">
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Checking {done}/{topicIds.length}…
        </>
      ) : (
        <>
          <ShieldCheck className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </Button>
  )
}
