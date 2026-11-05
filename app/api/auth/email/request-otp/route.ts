import { NextResponse } from 'next/server'
import { db, ensureSchemaSynced } from '@/db'
import { verificationTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  generateEmailOtpCode,
  sendEmailVerificationCode,
  decryptEmailTicketPayload,
} from '@/lib/email-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await ensureSchemaSynced()
    const body = await request.json()
    const { ticketToken, email } = body || {}

    let targetEmail = (email || '').trim().toLowerCase()

    if (ticketToken) {
      try {
        const payload = decryptEmailTicketPayload(ticketToken)
        targetEmail = payload.email.toLowerCase()
      } catch (err) {
        // Fall back to email param if valid
      }
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 })
    }

    // Generate new OTP
    const otpCode = generateEmailOtpCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Store in verification_tokens
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, targetEmail))
    await db.insert(verificationTokens).values({
      identifier: targetEmail,
      token: otpCode,
      expires: expiresAt,
    })

    const sendResult = await sendEmailVerificationCode(targetEmail, otpCode)
    if (!sendResult.success && process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to resend verification email via Resend.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      retryAfterSeconds: 60,
      debugOtp: sendResult.debugOtp,
    })
  } catch (error: any) {
    console.error('Email request-otp error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to resend verification code.' },
      { status: 500 }
    )
  }
}

