"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { List, Columns2, CheckCircle2 } from "lucide-react"
import { TranscriptSection } from "@/components/transcript-section"
import { TimelineView } from "@/components/timeline-view"
import { UtteranceEditModal } from "@/components/utterance-edit-modal"

type Speaker = { id: string; label: string }
type Utterance = { id: string; text: string; startMs: number; endMs: number; speakerId: string; speaker: Speaker }

export function DiscussionView({
  utterances,
  speakers,
  totalDuration,
}: {
  utterances: Utterance[]
  speakers: Speaker[]
  totalDuration: number // seconds
}) {
  const router = useRouter()
  const [view, setView] = useState<"transcript" | "timeline">("transcript")
  const [editing, setEditing] = useState<Utterance | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(t)
  }, [saved])

  return (
    <div className="flex flex-col gap-4">
      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Transcript</h2>
          {saved ? (
            <span className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">— click any line to edit</span>
          )}
        </div>
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button
            onClick={() => setView("transcript")}
            className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors
              ${view === "transcript" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <List className="w-3.5 h-3.5" />
            Transcript
          </button>
          <button
            onClick={() => setView("timeline")}
            className={`px-3 py-1.5 flex items-center gap-1.5 border-l transition-colors
              ${view === "timeline" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            Timeline
          </button>
        </div>
      </div>

      {view === "transcript" ? (
        <TranscriptSection utterances={utterances} speakers={speakers} onEdit={setEditing} />
      ) : (
        <TimelineView utterances={utterances} speakers={speakers} totalDuration={totalDuration} onEdit={setEditing} />
      )}

      {editing && (
        <UtteranceEditModal
          utterance={editing}
          speakers={speakers}
          open={true}
          onClose={() => setEditing(null)}
          onSaved={() => { router.refresh(); setEditing(null); setSaved(true) }}
        />
      )}
    </div>
  )
}
