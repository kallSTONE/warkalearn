import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'
import { users, profiles, accounts, sessions, verificationTokens } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { normalizePhoneToE164 } from '@/lib/phone-auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
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

        // Fetch profile to get role and extra info
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, user.id),
        })

        return {
          id: user.id,
          email: user.email,
          name: profile?.fullName ?? user.name,
          image: profile?.avatarUrl ?? user.image,
          role: profile?.role ?? 'student',
          fullName: (profile?.fullName ?? user.name) ?? undefined,
          avatarUrl: (profile?.avatarUrl ?? user.image) ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role ?? 'student'
        token.fullName = user.fullName ?? user.name ?? ''
        token.avatarUrl = user.avatarUrl ?? user.image ?? ''
      }

      const userId = (token.id as string) ?? (token.sub as string)
      if (userId && !token.role) {
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, userId),
        })

        token.role = profile?.role ?? 'student'
        token.fullName = profile?.fullName ?? (token.name as string)
        token.avatarUrl = profile?.avatarUrl ?? (token.picture as string)
      }

      return token
    },
    async session({ session, token }) {
      const userId = (token.id as string) ?? (token.sub as string)
      if (userId && session.user) {
        session.user.id = userId
        session.user.role = (token.role as string) ?? 'student'
        session.user.fullName = (token.fullName as string) ?? session.user.name ?? ''
        session.user.avatarUrl = (token.avatarUrl as string) ?? session.user.image ?? ''
      }
      return session
    },
  },
})
