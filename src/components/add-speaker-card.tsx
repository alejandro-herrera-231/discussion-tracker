"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Check, X } from "lucide-react"

export function AddSpeakerCard({ recordingId }: { recordingId: string }) {
  const router = useRouter()
  const [active, setActive] = useState(false)
  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function open() {
    setActive(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function cancel() {
    setActive(false)
    setLabel("")
  }

  async function save() {
    if (!label.trim()) return
    setSaving(true)
    await fetch(`/api/recordings/${recordingId}/speakers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    })
    setSaving(false)
    setActive(false)
    setLabel("")
    router.refresh()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") cancel()
  }

  return (
    <Card className="border-dashed">
      <CardContent className="px-3 py-2.5">
        {active ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speaker name…"
              className="text-sm bg-transparent outline-none flex-1 min-w-0"
            />
            <button
              onClick={save}
              disabled={!label.trim() || saving}
              className="p-0.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-30 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={cancel}
              className="p-0.5 rounded text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={open}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add speaker
          </button>
        )}
      </CardContent>
    </Card>
  )
}
