import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Protected routes that require being logged in
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reviewer')

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based protection: Admin routes
  if (pathname.startsWith('/admin') && isLoggedIn) {
    const role = (req.auth?.user as any)?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
    }
  }

  // Role-based protection: Reviewer routes
  if (pathname.startsWith('/reviewer') && isLoggedIn) {
    const role = (req.auth?.user as any)?.role
    if (role !== 'reviewer' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/reviewer/:path*',
  ],
}

