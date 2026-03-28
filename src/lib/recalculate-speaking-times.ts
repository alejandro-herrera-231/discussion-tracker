import { prisma } from "./prisma"

export async function recalculateSpeakingTimes(recordingId: string) {
  const speakers = await prisma.speaker.findMany({
    where: { recordingId },
    include: { utterances: true },
  })

  await Promise.all(
    speakers.map((speaker) => {
      const totalMs = speaker.utterances.reduce((sum, u) => sum + (u.endMs - u.startMs), 0)
      return prisma.speaker.update({
        where: { id: speaker.id },
        data: { totalSpeakingTime: totalMs / 1000 },
      })
    })
  )
}
