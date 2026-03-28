import { MessageSquareOff, XCircle, AlertTriangle } from "lucide-react"

const STATS = [
  { icon: MessageSquareOff, label: "Interruptions", value: "—" },
  { icon: XCircle, label: "Incorrect Facts", value: "—" },
  { icon: AlertTriangle, label: "Contradictions", value: "—" },
]

export function StatisticsSection() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        {STATS.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-dashed bg-muted/20 p-4 flex flex-col items-center gap-2 opacity-60"
          >
            <Icon className="w-6 h-6 text-muted-foreground" />
            <span className="text-2xl font-bold text-muted-foreground">{value}</span>
            <span className="text-xs text-muted-foreground text-center">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">Run AI analysis to populate statistics</p>
    </div>
  )
}
