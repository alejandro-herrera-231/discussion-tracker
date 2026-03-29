"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Mail } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const verifyParam = searchParams.get("verify")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [magicEmail, setMagicEmail] = useState("")
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(verifyParam === "1")
  const [magicError, setMagicError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError("Invalid email or password")
    } else {
      router.push("/dashboard")
    }
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!magicEmail.trim()) return
    setMagicLoading(true)
    setMagicError("")
    const result = await signIn("email", { email: magicEmail, redirect: false })
    setMagicLoading(false)
    if (result?.error) {
      setMagicError("Invalid email address. Please check and try again.")
    } else {
      setMagicSent(true)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Choose how you'd like to continue</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">

        {/* OAuth error */}
        {errorParam === "OAuthAccountNotLinked" && (
          <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
            An account with this email already exists. Sign in with your password below, or use the magic-link option.
          </p>
        )}

        {/* OAuth buttons */}
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="gap-2 justify-start" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
            <GoogleIcon />
            Continue with Google
          </Button>
        </div>

        <Divider label="or sign in with a magic link" />

        {/* Magic link */}
        {magicSent ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <Mail className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">Check your inbox</p>
            <p className="text-xs text-muted-foreground">We sent a sign-in link to {magicEmail || "your email"}.</p>
            <button onClick={() => setMagicSent(false)} className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground mt-1">
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" variant="outline" disabled={magicLoading}>
                {magicLoading ? "Sending…" : "Send link"}
              </Button>
            </div>
            {magicError && <p className="text-sm text-destructive">{magicError}</p>}
          </form>
        )}

        <Divider label="or sign in with password" />

        {/* Credentials form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" className="pr-9" />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="underline underline-offset-4">Sign up</Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
