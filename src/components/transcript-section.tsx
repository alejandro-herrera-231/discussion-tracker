"use client"

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

function formatTimestamp(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60).toString().padStart(2, "0")
  const s = (total % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

type Speaker = { id: string; label: string }
type Utterance = { id: string; text: string; startMs: number; endMs: number; speakerId: string; speaker: Speaker }

export function TranscriptSection({
  utterances,
  speakers,
  onEdit,
}: {
  utterances: Utterance[]
  speakers: Speaker[]
  onEdit: (utterance: Utterance) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {utterances.map((u) => {
        const speakerIndex = speakers.findIndex((s) => s.id === u.speakerId)
        return (
          <div
            key={u.id}
            onClick={() => onEdit(u)}
            className="flex gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors group"
          >
            <span className="text-xs text-muted-foreground mt-1 w-10 shrink-0 tabular-nums">
              {formatTimestamp(u.startMs)}
            </span>
            <div className="flex flex-col gap-1 flex-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length]}`}>
                {u.speaker.label}
              </span>
              <p className="text-sm leading-relaxed">{u.text}</p>
            </div>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0">
              Edit
            </span>
          </div>
        )
      })}
    </div>
  )
}
