const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

type Speaker = { id: string; label: string }
type TopicStance = { id: string; speakerId: string; stance: string; speaker: Speaker }
type Topic = { id: string; title: string; description: string; importance: number; stances: TopicStance[] }
type Analysis = { summary: string; topics: Topic[] }

function ImportanceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-4">{value}</span>
    </div>
  )
}

export function AnalysisSection({
  analysis,
  speakers,
}: {
  analysis: Analysis
  speakers: Speaker[]
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="rounded-xl border bg-muted/30 p-5 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Topics */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">Topics discussed</h3>
        {analysis.topics.map((topic) => (
          <div key={topic.id} className="rounded-xl border p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <h4 className="font-semibold">{topic.title}</h4>
                <p className="text-sm text-muted-foreground">{topic.description}</p>
              </div>
              <div className="w-24 shrink-0 pt-1">
                <ImportanceBar value={topic.importance} />
              </div>
            </div>

            {/* Stances */}
            {topic.stances.length > 0 && (
              <div className="flex flex-col gap-2 pt-1 border-t">
                {topic.stances.map((stance) => {
                  const speakerIndex = speakers.findIndex((s) => s.id === stance.speakerId)
                  return (
                    <div key={stance.id} className="flex gap-3 items-start">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length]}`}>
                        {stance.speaker.label}
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed">{stance.stance}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
