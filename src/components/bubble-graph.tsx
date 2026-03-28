"use client"

import { useEffect, useState } from "react"
import * as d3 from "d3"

const WIDTH = 700
const HEIGHT = 460

const BUBBLE_COLORS = [
  "#dbeafe", "#ede9fe", "#fce7f3", "#ffedd5",
  "#ccfbf1", "#d1fae5", "#fef9c3", "#fee2e2",
]

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
]

type Stance = { id: string; speakerId: string; stance: string; speaker: { id: string; label: string } }
type SubTopic = { id: string; title: string; description: string; importance: number; stances: Stance[] }
type TopicNode = {
  id: string
  title: string
  description: string
  importance: number
  stances: Stance[]
  children: SubTopic[]
}

type SimNode = {
  id: string
  title: string
  description: string
  importance: number
  stances: Stance[]
  isChild: boolean
  colorIndex: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}

type SimLink = { source: SimNode; target: SimNode }

function getRadius(importance: number, isChild: boolean) {
  return isChild ? 16 + importance * 3 : 28 + importance * 6
}

function wrapTitle(title: string, r: number): string[] {
  const maxChars = r > 65 ? 13 : r > 45 ? 10 : 8
  const words = title.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if (current && (current + " " + word).length > maxChars) {
      lines.push(current)
      current = word
    } else {
      current = current ? current + " " + word : word
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

export function BubbleGraph({
  topics,
  speakers,
}: {
  topics: TopicNode[]
  speakers: { id: string; label: string }[]
}) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [links, setLinks] = useState<{ sourceId: string; targetId: string }[]>([])
  const [selected, setSelected] = useState<SimNode | null>(null)

  // Flatten topics + children into one node list
  const allNodes: SimNode[] = []
  topics.forEach((t, i) => {
    allNodes.push({ id: t.id, title: t.title, description: t.description, importance: t.importance, stances: t.stances, isChild: false, colorIndex: i })
    t.children.forEach((c) => {
      allNodes.push({ id: c.id, title: c.title, description: c.description, importance: c.importance, stances: c.stances, isChild: true, colorIndex: i })
    })
  })

  const linkDefs = topics.flatMap((t) => t.children.map((c) => ({ sourceId: t.id, targetId: c.id })))

  useEffect(() => {
    if (allNodes.length === 0) return

    const simNodes: SimNode[] = allNodes.map((n) => ({
      ...n,
      x: WIDTH / 2 + (Math.random() - 0.5) * 150,
      y: HEIGHT / 2 + (Math.random() - 0.5) * 150,
    }))

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]))

    const simLinks: SimLink[] = linkDefs.flatMap(({ sourceId, targetId }) => {
      const s = nodeMap.get(sourceId)
      const t = nodeMap.get(targetId)
      if (!s || !t) return []
      return [{ source: s, target: t }]
    })

    const sim = d3
      .forceSimulation(simNodes)
      .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2).strength(0.05))
      .force("charge", d3.forceManyBody().strength(20))
      .force(
        "collision",
        d3.forceCollide<SimNode>((d) => getRadius(d.importance, d.isChild) + 6)
      )
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => getRadius(l.source.importance, false) + getRadius(l.target.importance, true) + 12)
          .strength(0.6)
      )
      .force("bound", () => {
        for (const node of simNodes) {
          const r = getRadius(node.importance, node.isChild)
          node.x = Math.max(r + 8, Math.min(WIDTH - r - 8, node.x ?? WIDTH / 2))
          node.y = Math.max(r + 8, Math.min(HEIGHT - r - 8, node.y ?? HEIGHT / 2))
        }
      })
      .alphaDecay(0.025)
      .on("tick", () => {
        const map = new Map<string, { x: number; y: number }>()
        for (const n of simNodes) map.set(n.id, { x: n.x ?? WIDTH / 2, y: n.y ?? HEIGHT / 2 })
        setPositions(new Map(map))
        setLinks(linkDefs)
      })

    return () => { sim.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics])

  return (
    <div className="flex flex-col gap-4">
      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="rounded-xl border bg-muted/20"
      >
        {/* Draw connector lines first (behind bubbles) */}
        {links.map(({ sourceId, targetId }) => {
          const s = positions.get(sourceId)
          const t = positions.get(targetId)
          if (!s || !t) return null
          return (
            <line
              key={`${sourceId}-${targetId}`}
              x1={s.x} y1={s.y}
              x2={t.x} y2={t.y}
              stroke="#d1d5db"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )
        })}

        {allNodes.map((node) => {
          const pos = positions.get(node.id)
          const x = pos?.x ?? WIDTH / 2
          const y = pos?.y ?? HEIGHT / 2
          const r = getRadius(node.importance, node.isChild)
          const isSelected = selected?.id === node.id
          const lines = wrapTitle(node.title, r)
          const fontSize = node.isChild ? (r > 35 ? 9 : 8) : (r > 60 ? 12 : r > 44 ? 11 : 9)

          return (
            <g
              key={node.id}
              transform={`translate(${x},${y})`}
              onClick={() => setSelected(isSelected ? null : node)}
              style={{ cursor: "pointer" }}
            >
              <circle
                r={r}
                fill={BUBBLE_COLORS[node.colorIndex % BUBBLE_COLORS.length]}
                stroke={isSelected ? "#111827" : node.isChild ? "#9ca3af" : "#d1d5db"}
                strokeWidth={isSelected ? 2.5 : node.isChild ? 1 : 1}
                opacity={node.isChild ? 0.85 : 1}
              />
              {lines.map((line, li) => (
                <text
                  key={li}
                  textAnchor="middle"
                  y={(li - (lines.length - 1) / 2) * (fontSize + 3)}
                  fontSize={fontSize}
                  fontWeight={node.isChild ? "500" : "600"}
                  fill="#111827"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}
      </svg>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-xl border p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              {selected.isChild && <p className="text-xs text-muted-foreground mb-0.5">Sub-topic</p>}
              <h4 className="font-semibold">{selected.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0"
            >
              ×
            </button>
          </div>
          {selected.stances.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t">
              {selected.stances.map((stance) => {
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
      )}
    </div>
  )
}
