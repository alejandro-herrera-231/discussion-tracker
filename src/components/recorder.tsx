"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mic, Square, RotateCcw, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type State = "idle" | "recording" | "ready" | "submitting"

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

export function Recorder() {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [title, setTitle] = useState("")
  const [speakersExpected, setSpeakersExpected] = useState<number | null>(null)
  const [error, setError] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function startRecording() {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        setState("ready")
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setState("recording")
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch {
      setError("Could not access microphone. Please allow microphone access and try again.")
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  function reset() {
    setAudioBlob(null)
    setElapsed(0)
    setTitle("")
    setState("idle")
  }

  async function submit() {
    if (!audioBlob) return
    setState("submitting")

    const formData = new FormData()
    formData.append("audio", audioBlob, "recording.webm")
    formData.append("title", title || "Untitled Discussion")
    if (speakersExpected !== null) formData.append("speakersExpected", String(speakersExpected))

    try {
      const res = await fetch("/api/recordings", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      router.push("/discussions")
    } catch {
      setError("Something went wrong uploading. Please try again.")
      setState("ready")
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {/* Speaker count selector — only shown before recording */}
      {state === "idle" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">How many people are participating?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSpeakersExpected(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                ${speakersExpected === null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}
            >
              Unknown
            </button>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setSpeakersExpected(n)}
                className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors
                  ${speakersExpected === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mic button */}
      <div className="relative flex items-center justify-center">
        {state === "recording" && (
          <span className="absolute inline-flex h-32 w-32 rounded-full bg-red-400 opacity-30 animate-ping" />
        )}
        <button
          onClick={state === "idle" ? startRecording : state === "recording" ? stopRecording : undefined}
          disabled={state === "ready" || state === "submitting"}
          className={`relative z-10 flex items-center justify-center w-28 h-28 rounded-full transition-colors shadow-lg
            ${state === "idle" ? "bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer" : ""}
            ${state === "recording" ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer" : ""}
            ${state === "ready" || state === "submitting" ? "bg-muted text-muted-foreground cursor-default" : ""}
          `}
        >
          {state === "recording" ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center">
        {state === "idle" && <p className="text-muted-foreground">Click to start recording</p>}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-2xl font-mono font-semibold text-red-500">{formatTime(elapsed)}</p>
            <p className="text-muted-foreground text-sm">Recording — click to stop</p>
          </div>
        )}
        {(state === "ready" || state === "submitting") && (
          <p className="text-muted-foreground text-sm">Recorded {formatTime(elapsed)}</p>
        )}
      </div>

      {/* Post-recording controls */}
      {(state === "ready" || state === "submitting") && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Discussion title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Team standup, Project review..."
              disabled={state === "submitting"}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset} disabled={state === "submitting"} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Re-record
            </Button>
            <Button onClick={submit} disabled={state === "submitting"} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              {state === "submitting" ? "Uploading…" : "Submit"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive text-center max-w-sm">{error}</p>}
    </div>
  )
}
