"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RecordingListActions } from "@/components/recording-list-actions"

type Recording = {
  id: string
  title: string
  status: string
  createdAt: Date
  speakers: { id: string }[]
}

function statusBadge(status: string) {
  switch (status) {
    case "DONE": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Done</Badge>
    case "PROCESSING": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>
    case "PENDING": return <Badge variant="secondary">Pending</Badge>
    case "ERROR": return <Badge variant="destructive">Error</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(date: Date) {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
}

function fullDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date))
}

export function DiscussionsList({ recordings }: { recordings: Recording[] }) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? recordings.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()))
    : recordings

  return (
    <div className="flex flex-col gap-4">
      {recordings.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search discussions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {query ? (
            <>
              <p>No discussions match &ldquo;{query}&rdquo;.</p>
              <button onClick={() => setQuery("")} className="text-sm underline underline-offset-4 mt-1 hover:text-foreground transition-colors">
                Clear search
              </button>
            </>
          ) : (
            <>
              <p>No discussions yet.</p>
              <p className="text-sm mt-1">Start a new recording to get going.</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => (
            <Link key={r.id} href={`/discussions/${r.id}`}>
              <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-sm text-muted-foreground" title={fullDate(r.createdAt)}>{formatDate(r.createdAt)}</span>
                    {r.speakers.length > 0 && (
                      <span className="text-sm text-muted-foreground">{r.speakers.length} speaker{r.speakers.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(r.status)}
                    <RecordingListActions id={r.id} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
