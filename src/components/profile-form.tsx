"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
      <hr className="border-border" />
    </div>
  )
}

function Avatar({ image, name, onUpload }: { image: string | null; name: string; onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => inputRef.current?.click()}
        className="relative w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center group shrink-0"
      >
        {image ? (
          <img src={image} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground">{initials}</span>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </button>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 2 MB</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          Upload new photo
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
      />
    </div>
  )
}

export function ProfileForm({
  name: initialName,
  image: initialImage,
  isOAuthOnly,
  recordingCount,
}: {
  name: string
  email: string
  image: string | null
  isOAuthOnly: boolean
  recordingCount: number
}) {
  const router = useRouter()

  // Avatar
  const [image, setImage] = useState(initialImage)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState("")

  // Name
  const [name, setName] = useState(initialName)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState("")
  const [nameSaved, setNameSaved] = useState(false)

  // Password
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSaved, setPwSaved] = useState(false)

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleAvatarUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2 MB")
      return
    }
    setAvatarLoading(true)
    setAvatarError("")
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/user/avatar", { method: "POST", body: form })
    const data = await res.json()
    setAvatarLoading(false)
    if (!res.ok) {
      setAvatarError(data.error ?? "Upload failed")
    } else {
      setImage(data.image)
      router.refresh()
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameLoading(true)
    setNameError("")
    setNameSaved(false)
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setNameLoading(false)
    if (!res.ok) {
      setNameError(data.error ?? "Failed to save")
    } else {
      setNameSaved(true)
      router.refresh()
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) {
      setPwError("New passwords don't match")
      return
    }
    setPwLoading(true)
    setPwError("")
    setPwSaved(false)
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    const data = await res.json()
    setPwLoading(false)
    if (!res.ok) {
      setPwError(data.error ?? "Failed to update password")
    } else {
      setPwSaved(true)
      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    await fetch("/api/user", { method: "DELETE" })
    await signOut({ callbackUrl: "/sign-in" })
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Avatar */}
      <Section title="Photo">
        <Avatar image={image} name={name} onUpload={handleAvatarUpload} />
        {avatarLoading && <p className="text-xs text-muted-foreground">Uploading…</p>}
        {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
      </Section>

      {/* Name */}
      <Section title="Display name">
        <form onSubmit={handleSaveName} className="flex gap-2">
          <Input
            value={name}
            onChange={e => { setName(e.target.value); setNameSaved(false) }}
            placeholder="Your name"
            className="flex-1"
          />
          <Button type="submit" variant="outline" disabled={nameLoading || !name.trim()}>
            {nameLoading ? "Saving…" : "Save"}
          </Button>
        </form>
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        {nameSaved && <p className="text-xs text-green-600">Name updated</p>}
      </Section>

      {/* Password */}
      <Section title="Password">
        {isOAuthOnly ? (
          <p className="text-sm text-muted-foreground">Your account uses Google sign-in — password change is not available.</p>
        ) : (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-pw">Current password</Label>
              <Input id="current-pw" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input id="confirm-pw" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
            </div>
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            {pwSaved && <p className="text-xs text-green-600">Password updated</p>}
            <Button type="submit" variant="outline" disabled={pwLoading} className="w-fit">
              {pwLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </Section>

      {/* Danger zone */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-destructive">Danger zone</h2>
        <Button variant="destructive" className="w-fit" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all{" "}
              <span className="font-medium text-foreground">{recordingCount} recording{recordingCount !== 1 ? "s" : ""}</span>.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
