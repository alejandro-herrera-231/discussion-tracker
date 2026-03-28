"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Speaker = { id: string; label: string }
type Utterance = { id: string; text: string; startMs: number; endMs: number; speakerId: string }

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-purple-100 text-purple-800 border-purple-300",
  "bg-pink-100 text-pink-800 border-pink-300",
  "bg-orange-100 text-orange-800 border-orange-300",
  "bg-teal-100 text-teal-800 border-teal-300",
]

function SpeakerPicker({
  speakers,
  value,
  onChange,
}: {
  speakers: Speaker[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {speakers.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-all
            ${SPEAKER_COLORS[i % SPEAKER_COLORS.length]}
            ${value === s.id ? "ring-2 ring-offset-1 ring-foreground" : "opacity-60 hover:opacity-100"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

export function UtteranceEditModal({
  utterance,
  speakers,
  open,
  onClose,
  onSaved,
}: {
  utterance: Utterance
  speakers: Speaker[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [selectedSpeaker, setSelectedSpeaker] = useState(utterance.speakerId)
  const [splitIndex, setSplitIndex] = useState<number | null>(null)
  const [split1Speaker, setSplit1Speaker] = useState(utterance.speakerId)
  const [split2Speaker, setSplit2Speaker] = useState(
    speakers.find((s) => s.id !== utterance.speakerId)?.id ?? speakers[0]?.id ?? ""
  )
  const [saving, setSaving] = useState(false)

  const words = utterance.text.trim().split(/\s+/)
  const speakerChanged = selectedSpeaker !== utterance.speakerId

  function handleWordClick(index: number) {
    if (index === 0) return // can't split before first word
    setSplitIndex(index === splitIndex ? null : index)
    setSplit1Speaker(selectedSpeaker)
  }

  async function handleSaveSpeaker() {
    setSaving(true)
    await fetch(`/api/utterances/${utterance.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speakerId: selectedSpeaker }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleSplit() {
    if (splitIndex === null) return
    setSaving(true)
    await fetch(`/api/utterances/${utterance.id}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordIndex: splitIndex, speaker1Id: split1Speaker, speaker2Id: split2Speaker }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit utterance</DialogTitle>
        </DialogHeader>

        {splitIndex === null ? (
          // ── Normal mode ──
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Speaker</p>
              <SpeakerPicker speakers={speakers} value={selectedSpeaker} onChange={setSelectedSpeaker} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Text
                <span className="text-muted-foreground font-normal ml-2">— click a word to split here</span>
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-7">
                {words.map((word, i) => (
                  <span
                    key={i}
                    onClick={() => handleWordClick(i)}
                    className={`cursor-pointer rounded px-0.5 hover:bg-yellow-200 transition-colors ${i === 0 ? "cursor-default" : ""}`}
                  >
                    {word}{" "}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSaveSpeaker} disabled={!speakerChanged || saving}>
                {saving ? "Saving…" : "Save speaker"}
              </Button>
            </div>
          </div>
        ) : (
          // ── Split mode ──
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">Assign a speaker to each part, then confirm the split.</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Part 1</p>
                <p className="text-sm leading-relaxed">{words.slice(0, splitIndex).join(" ")}</p>
                <SpeakerPicker speakers={speakers} value={split1Speaker} onChange={setSplit1Speaker} />
              </div>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Part 2</p>
                <p className="text-sm leading-relaxed">{words.slice(splitIndex).join(" ")}</p>
                <SpeakerPicker speakers={speakers} value={split2Speaker} onChange={setSplit2Speaker} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSplitIndex(null)}>Back</Button>
              <Button onClick={handleSplit} disabled={saving}>
                {saving ? "Splitting…" : "Confirm split"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
