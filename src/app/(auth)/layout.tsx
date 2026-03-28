import Link from "next/link"
import { Mic } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4">
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg mb-8">
        <Mic className="w-5 h-5 text-primary" />
        Discussion Tracker
      </Link>
      {children}
    </div>
  )
}
