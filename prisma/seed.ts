import { PrismaClient } from "../src/generated/prisma"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash("password123", 12)

  await prisma.user.upsert({
    where: { email: "alex@test.com" },
    update: {},
    create: { email: "alex@test.com", password, name: "Alex" },
  })

  await prisma.user.upsert({
    where: { email: "demo@test.com" },
    update: {},
    create: { email: "demo@test.com", password, name: "Demo User" },
  })

  console.log("Seeded 2 test users (password: password123)")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
