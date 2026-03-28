"use client"

import { useState } from "react"
import { ChevronDown, Clock, BarChart2, FileText, TrendingUp } from "lucide-react"

type ColorTheme = "gold" | "cobalt" | "ivory" | "seagreen"
type IconName = "clock" | "bar-chart" | "file-text" | "trending-up"

const ICON_MAP: Record<IconName, React.ComponentType<{ className?: string }>> = {
  "clock": Clock,
  "bar-chart": BarChart2,
  "file-text": FileText,
  "trending-up": TrendingUp,
}

const COLOR_MAP: Record<ColorTheme, { outer: string; header: string; body: string; accent: string }> = {
  gold:     { outer: "border-border", header: "bg-background", body: "bg-background border-border", accent: "text-foreground" },
  cobalt:   { outer: "border-border", header: "bg-background", body: "bg-background border-border", accent: "text-foreground" },
  ivory:    { outer: "border-border", header: "bg-background", body: "bg-background border-border", accent: "text-foreground" },
  seagreen: { outer: "border-border", header: "bg-background", body: "bg-background border-border", accent: "text-foreground" },
}

export function CollapsibleBlock({
  title,
  icon,
  color,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: IconName
  color: ColorTheme
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const theme = COLOR_MAP[color]
  const Icon = ICON_MAP[icon]

  return (
    <div className={`rounded-xl border overflow-hidden ${theme.outer}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-3.5 ${theme.header}`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${theme.accent}`} />
          <span className={`font-semibold text-base ${theme.accent}`}>{title}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 ${theme.accent} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className={`border-t p-5 ${theme.body}`}>
          {children}
        </div>
      )}
    </div>
  )
}
