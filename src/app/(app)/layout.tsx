import Link from "next/link"
import { Mic } from "lucide-react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SignOutButton } from "@/components/sign-out-button"
import { NavLinks } from "@/components/nav-links"

function UserAvatar({ name, image }: { name?: string | null; image?: string | null }) {
  const initials = (name ?? "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
      {image ? (
        <img src={image} alt={name ?? "Profile"} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

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
          <NavLinks />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:flex">
            <UserAvatar name={session?.user.name} image={session?.user.image} />
            <span>{session?.user.name ?? session?.user.email}</span>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 container max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
