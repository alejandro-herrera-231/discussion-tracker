import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Recorder } from "@/components/recorder"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/sign-in")

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">New Discussion</h1>
        <p className="text-muted-foreground mt-1">Record your discussion and we&apos;ll transcribe it with speaker labels.</p>
      </div>
      <Recorder />
    </div>
  )
}
