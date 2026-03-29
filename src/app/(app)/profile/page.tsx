import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ProfileForm } from "@/components/profile-form"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/sign-in")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { accounts: { select: { provider: true } }, _count: { select: { recordings: true } } },
  })

  if (!user) redirect("/sign-in")

  return (
    <div className="max-w-lg flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
      </div>
      <ProfileForm
        name={user.name ?? ""}
        email={user.email}
        image={user.image ?? null}
        isOAuthOnly={!user.password}
        recordingCount={user._count.recordings}
      />
    </div>
  )
}
