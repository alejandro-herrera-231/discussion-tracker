"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, Trash2 } from "lucide-react"

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function EditableSpeakerCard({
  speaker,
  index,
}: {
  speaker: { id: string; label: string; totalSpeakingTime: number }
  index: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(speaker.label)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const canDelete = speaker.totalSpeakingTime === 0

  function startEditing() {
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function save() {
    setEditing(false)
    if (!label.trim() || label.trim() === speaker.label) {
      setLabel(speaker.label)
      return
    }
    await fetch(`/api/speakers/${speaker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    })
    router.refresh()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") { setLabel(speaker.label); setEditing(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError("")
    const res = await fetch(`/api/speakers/${speaker.id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      setDeleteError(data.error ?? "Could not delete speaker")
      setDeleting(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Card>
        <CardContent className="px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {editing ? (
              <input
                ref={inputRef}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={save}
                onKeyDown={handleKeyDown}
                className="text-xs font-medium bg-transparent border-b border-foreground outline-none w-full"
              />
            ) : (
              <button
                onClick={startEditing}
                className="flex items-center gap-1 group min-w-0"
              >
                <span className="text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                  {label}
                </span>
                <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${SPEAKER_COLORS[index % SPEAKER_COLORS.length]}`}>
              {formatDuration(speaker.totalSpeakingTime)}
            </span>
          </div>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            title={canDelete ? "Remove speaker" : "Reassign all utterances before removing"}
            className={`shrink-0 p-1 rounded transition-colors ${
              canDelete
                ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </CardContent>
      </Card>
      {deleteError && <p className="text-xs text-destructive px-1">{deleteError}</p>}
    </div>
  )
}
