"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function StatusPoller({ recordingId }: { recordingId: string }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/recordings/${recordingId}/status`)
      const data = await res.json()
      if (data.status === "DONE" || data.status === "ERROR") {
        clearInterval(interval)
        router.refresh()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [recordingId, router])

  return null
}
