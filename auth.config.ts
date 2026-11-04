import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role ?? 'student'
        token.fullName = user.fullName ?? user.name ?? ''
        token.avatarUrl = user.avatarUrl ?? user.image ?? ''
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string)
        session.user.role = (token.role as string) ?? 'student'
        session.user.fullName = (token.fullName as string) ?? session.user.name ?? ''
        session.user.avatarUrl = (token.avatarUrl as string) ?? session.user.image ?? ''
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const isProtected =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/reviewer')

      if (isProtected && !isLoggedIn) {
        return false // automatically redirects to /login
      }

      if (pathname.startsWith('/admin') && isLoggedIn) {
        const role = (auth?.user as any)?.role
        if (role !== 'admin') {
          return Response.redirect(new URL('/dashboard', nextUrl))
        }
      }

      if (pathname.startsWith('/reviewer') && isLoggedIn) {
        const role = (auth?.user as any)?.role
        if (role !== 'reviewer' && role !== 'admin') {
          return Response.redirect(new URL('/dashboard', nextUrl))
        }
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
