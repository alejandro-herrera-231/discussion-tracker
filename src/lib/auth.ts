import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { Resend } from "resend"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

const resend = new Resend(process.env.RESEND_API_KEY)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      from: "onboarding@resend.dev",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await resend.emails.send({
          from: "Discussion Tracker <onboarding@resend.dev>",
          to: email,
          subject: "Sign in to Discussion Tracker",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin-bottom:8px">Sign in to Discussion Tracker</h2>
              <p style="color:#666;margin-bottom:24px">Click the button below to sign in. This link expires in 24 hours.</p>
              <a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500">Sign in</a>
              <p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        })
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        // OAuth/magic-link users have no password — block credentials sign-in for them
        if (!user || !user.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in?verify=1",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
}
