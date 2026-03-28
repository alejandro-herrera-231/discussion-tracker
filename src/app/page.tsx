import Link from "next/link"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Mic className="w-5 h-5 text-primary" />
          Discussion Tracker
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
          <Mic className="w-10 h-10 text-primary" />
        </div>

        <div className="max-w-2xl flex flex-col gap-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Understand every discussion
          </h1>
          <p className="text-xl text-muted-foreground">
            Record any conversation, and get an instant transcript broken down by speaker —
            including exactly how long each person spoke.
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Start for free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mt-8 text-left">
          {[
            { title: "Speaker diarization", desc: "Automatically identifies who is speaking at any point in the conversation." },
            { title: "Speaking time", desc: "See exactly how much time each participant spent talking." },
            { title: "Full transcript", desc: "Every word, attributed to the right speaker, in order." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border p-5 flex flex-col gap-2">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Built for the hackathon
      </footer>
    </div>
  )
}
