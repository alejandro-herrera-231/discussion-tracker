"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavLinks() {
  const pathname = usePathname()

  function cls(href: string) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
    return active
      ? "text-foreground font-medium"
      : "text-muted-foreground hover:text-foreground transition-colors"
  }

  return (
    <nav className="flex gap-4 text-sm">
      <Link href="/dashboard" className={cls("/dashboard")}>Record</Link>
      <Link href="/discussions" className={cls("/discussions")}>Discussions</Link>
    </nav>
  )
}
