"use client"

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

const SPEAKER_BORDER_COLORS = [
  "border-blue-300",
  "border-purple-300",
  "border-pink-300",
  "border-orange-300",
  "border-teal-300",
]

const MERGE_THRESHOLD_MS = 3500

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = Math.floor(seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

type Speaker = { id: string; label: string }
type Utterance = { id: string; text: string; startMs: number; endMs: number; speakerId: string; speaker: Speaker }

type MergedBlock = {
  key: string
  text: string
  startMs: number
  endMs: number
  count: number
  firstUtterance: Utterance
}

function mergeCloseUtterances(utterances: Utterance[]): MergedBlock[] {
  if (utterances.length === 0) return []
  const sorted = [...utterances].sort((a, b) => a.startMs - b.startMs)
  const blocks: MergedBlock[] = []
  let group = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = group[group.length - 1]
    const curr = sorted[i]
    if (curr.startMs - prev.endMs < MERGE_THRESHOLD_MS) {
      group.push(curr)
    } else {
      blocks.push(groupToBlock(group))
      group = [curr]
    }
  }
  blocks.push(groupToBlock(group))
  return blocks
}

function groupToBlock(group: Utterance[]): MergedBlock {
  return {
    key: group.map((u) => u.id).join("-"),
    text: group.map((u) => u.text).join(" "),
    startMs: group[0].startMs,
    endMs: group[group.length - 1].endMs,
    count: group.length,
    firstUtterance: group[0],
  }
}

export function TimelineView({
  utterances,
  speakers,
  totalDuration,
  onEdit,
}: {
  utterances: Utterance[]
  speakers: Speaker[]
  totalDuration: number
  onEdit: (utterance: Utterance) => void
}) {
  const PX_PER_SECOND = 15
  const containerHeight = Math.max(400, totalDuration * PX_PER_SECOND)
  const tickInterval = totalDuration > 300 ? 60 : 30
  const ticks = Array.from(
    { length: Math.floor(totalDuration / tickInterval) + 1 },
    (_, i) => i * tickInterval
  )

  return (
    <div>
      {/* Column headers */}
      <div className="flex gap-3 mb-4" style={{ paddingLeft: "3.5rem" }}>
        {speakers.map((s, i) => (
          <div
            key={s.id}
            className={`flex-1 text-center text-sm font-semibold py-1 px-2 rounded-full border ${SPEAKER_COLORS[i % SPEAKER_COLORS.length]} ${SPEAKER_BORDER_COLORS[i % SPEAKER_BORDER_COLORS.length]}`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Timeline body */}
      <div className="flex gap-3" style={{ height: containerHeight }}>
        {/* Time ruler */}
        <div className="relative w-12 shrink-0">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute right-0 flex items-center gap-1"
              style={{ top: `${(tick / totalDuration) * containerHeight}px` }}
            >
              <span className="text-xs text-muted-foreground tabular-nums">{formatTimestamp(tick)}</span>
              <div className="w-2 h-px bg-border" />
            </div>
          ))}
        </div>

        {/* Speaker columns */}
        {speakers.map((speaker, i) => {
          const speakerUtterances = utterances.filter((u) => u.speakerId === speaker.id)
          const blocks = mergeCloseUtterances(speakerUtterances)

          return (
            <div
              key={speaker.id}
              className={`relative flex-1 border-l-2 ${SPEAKER_BORDER_COLORS[i % SPEAKER_BORDER_COLORS.length]}`}
            >
              {blocks.map((block) => {
                const top = (block.startMs / (totalDuration * 1000)) * containerHeight
                const height = Math.max(38, ((block.endMs - block.startMs) / (totalDuration * 1000)) * containerHeight)
                // text-xs leading-snug ≈ 16.5px/line (12px * 1.375), px-2 py-1 = 8px vertical padding
                // Subtract 2px buffer so the last line never gets partially clipped by overflow-hidden
                const partsBadge = block.count > 1 ? 20 : 0
                const maxLines = Math.max(1, Math.floor((height - 8 - partsBadge - 2) / 16.5))
                return (
                  <div
                    key={block.key}
                    onClick={() => onEdit(block.firstUtterance)}
                    className={`absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer overflow-hidden border
                      hover:ring-2 hover:ring-foreground/20 transition-all
                      ${SPEAKER_COLORS[i % SPEAKER_COLORS.length]}
                      ${SPEAKER_BORDER_COLORS[i % SPEAKER_BORDER_COLORS.length]}`}
                    style={{ top, height }}
                  >
                    <p
                      className="text-xs leading-snug overflow-hidden"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: maxLines,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {block.text}
                    </p>
                    {block.count > 1 && (
                      <p className="text-xs opacity-50 mt-1">{block.count} parts</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
