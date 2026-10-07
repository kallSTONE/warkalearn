import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: string
      fullName?: string
      avatarUrl?: string
    } & DefaultSession['user']
  }

  interface User {
    id?: string
    role?: string
    fullName?: string
    avatarUrl?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    fullName?: string
    avatarUrl?: string
  }
}

