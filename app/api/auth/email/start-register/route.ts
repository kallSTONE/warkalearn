import { NextResponse } from 'next/server'
import { db, ensureSchemaSynced } from '@/db'
import { users, verificationTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { isLikelyEmail } from '@/lib/auth-identifier'
import {
  generateEmailOtpCode,
  maskEmail,
  encryptEmailTicketPayload,
  sendEmailVerificationCode,
} from '@/lib/email-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await ensureSchemaSynced()
    const body = await request.json()
    const { email, fullName, password, referralCode } = body || {}

    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanName = (fullName || '').trim()
    const cleanPassword = password || ''

    if (!cleanName) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }

    if (!cleanEmail || !isLikelyEmail(cleanEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      )
    }

    // Generate 6-digit OTP code
    const otpCode = generateEmailOtpCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store in verification_tokens
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, cleanEmail))
    await db.insert(verificationTokens).values({
      identifier: cleanEmail,
      token: otpCode,
      expires: expiresAt,
    })

    // Send code
    const sendResult = await sendEmailVerificationCode(cleanEmail, otpCode)
    if (!sendResult.success && process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send verification email via Resend.' },
        { status: 400 }
      )
    }

    // Create encrypted ticket token
    const ticketToken = encryptEmailTicketPayload({
      email: cleanEmail,
      fullName: cleanName,
      password: cleanPassword,
      referralCode: referralCode?.trim() || undefined,
    })

    return NextResponse.json({
      success: true,
      ticketToken,
      email: cleanEmail,
      maskedEmail: maskEmail(cleanEmail),
      retryAfterSeconds: 60,
      debugOtp: sendResult.debugOtp,
    })
  } catch (error: any) {
    console.error('Email start-register error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to start email registration.' },
      { status: 500 }
    )
  }
}

