import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'
import { users, profiles, accounts, sessions, verificationTokens } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { normalizePhoneToE164 } from '@/lib/phone-auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null
        }

        const identifier = String(credentials.identifier).trim()
        const password = String(credentials.password)

        // 1. Try finding user by email
        let user = await db.query.users.findFirst({
          where: eq(users.email, identifier.toLowerCase()),
        })

        // 2. If not found by email, try normalized phone number
        if (!user) {
          try {
            const normalizedPhone = normalizePhoneToE164(identifier)
            user = await db.query.users.findFirst({
              where: eq(users.phone, normalizedPhone),
            })
          } catch {
            // Identifier is not a phone number
          }
        }

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id

        // Fetch role and details from profiles
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, user.id),
        })

        token.role = profile?.role ?? 'lawyer'
        token.fullName = profile?.fullName ?? user.name
        token.avatarUrl = profile?.avatarUrl ?? user.image
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).fullName = token.fullName as string
        ;(session.user as any).avatarUrl = token.avatarUrl as string
      }
      return session
    },
  },
})

