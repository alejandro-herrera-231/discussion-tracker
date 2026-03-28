"use client"

import { useEffect, useState } from "react"
import * as d3 from "d3"

const COLORS = ["#93c5fd", "#c4b5fd", "#f9a8d4", "#fdba74", "#5eead4"]

type Speaker = { id: string; label: string; totalSpeakingTime: number }
type Arc = { id: string; path: string; color: string; label: string; pct: number }

export function SpeakerPieChart({ speakers }: { speakers: Speaker[] }) {
  const [arcs, setArcs] = useState<Arc[]>([])

  useEffect(() => {
    const total = speakers.reduce((sum, s) => sum + s.totalSpeakingTime, 0)
    if (total === 0) return

    const pie = d3.pie<Speaker>().value((d) => d.totalSpeakingTime).sort(null)
    const arc = d3.arc<d3.PieArcDatum<Speaker>>().outerRadius(82).innerRadius(50)

    const computed = pie(speakers).map((slice, i) => ({
      id: speakers[i].id,
      path: arc(slice) ?? "",
      color: COLORS[i % COLORS.length],
      label: speakers[i].label,
      pct: Math.round((speakers[i].totalSpeakingTime / total) * 100),
    }))

    setArcs(computed)
  }, [speakers])

  const total = speakers.reduce((sum, s) => sum + s.totalSpeakingTime, 0)
  if (total === 0) return null

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 180 180" width={180} height={180} className="shrink-0">
        <g transform="translate(90, 90)">
          {arcs.map((a) => (
            <path key={a.id} d={a.path} fill={a.color} stroke="white" strokeWidth={2} />
          ))}
        </g>
      </svg>

      <div className="flex flex-col gap-2">
        {arcs.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-muted-foreground">{a.label}</span>
            <span className="font-semibold tabular-nums">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
