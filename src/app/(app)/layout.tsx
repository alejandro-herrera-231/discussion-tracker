import Link from "next/link"
import { Mic } from "lucide-react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SignOutButton } from "@/components/sign-out-button"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            <Mic className="w-5 h-5 text-primary" />
            Discussion Tracker
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Record
            </Link>
            <Link href="/discussions" className="text-muted-foreground hover:text-foreground transition-colors">
              Discussions
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {session?.user.name ?? session?.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 container max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
