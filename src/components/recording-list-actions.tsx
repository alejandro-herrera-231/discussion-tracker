"use client"

import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RecordingListActions({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Delete this recording? This cannot be undone.")) return

    await fetch(`/api/recordings/${id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive shrink-0"
      onClick={handleDelete}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
