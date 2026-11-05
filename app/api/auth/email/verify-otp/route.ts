import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq, and, gt } from 'drizzle-orm'
import { db, ensureSchemaSynced } from '@/db'
import { users, profiles, verificationTokens, referralInvites, referralProfiles } from '@/db/schema'
import { decryptEmailTicketPayload } from '@/lib/email-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await ensureSchemaSynced()
    const body = await request.json()
    const { ticketToken, otp } = body || {}

    const cleanOtp = (otp || '').trim()

    if (!ticketToken || !cleanOtp) {
      return NextResponse.json(
        { error: 'Ticket token and verification code are required.' },
        { status: 400 }
      )
    }

    // 1. Decrypt ticket token
    let payload: {
      email: string
      fullName: string
      password: string
      referralCode?: string
    }

    try {
      payload = decryptEmailTicketPayload(ticketToken)
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Invalid or expired registration ticket. Please register again.' },
        { status: 400 }
      )
    }

    const cleanEmail = payload.email.toLowerCase()

    // 2. Verify OTP in verification_tokens
    const record = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.identifier, cleanEmail),
        eq(verificationTokens.token, cleanOtp),
        gt(verificationTokens.expires, new Date())
      ),
    })

    if (!record) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please check and try again.' },
        { status: 400 }
      )
    }

    // 3. Double-check if user was created while verifying
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    })

    if (existingUser) {
      // Clean up token
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, cleanEmail))
      return NextResponse.json({
        success: true,
        email: cleanEmail,
        password: payload.password,
      })
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(payload.password, 10)

    // 5. Create user, profile, referral in atomic transaction
    const newUser = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: cleanEmail,
          name: payload.fullName,
          passwordHash,
          emailVerified: new Date(),
        })
        .returning()

      await tx.insert(profiles).values({
        id: user.id,
        fullName: payload.fullName,
        role: 'student',
      })

      // Generate a referral code for this new user
      const userRefCode =
        payload.fullName
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 6) + Math.floor(1000 + Math.random() * 9000)

      await tx.insert(referralProfiles).values({
        userId: user.id,
        referralCode: userRefCode,
      }).onConflictDoNothing()

      // Handle referral code if provided
      if (payload.referralCode) {
        const cleanRefCode = payload.referralCode.trim().toUpperCase()
        const referrer = await tx.query.referralProfiles.findFirst({
          where: eq(referralProfiles.referralCode, cleanRefCode),
        })

        if (referrer && referrer.userId !== user.id) {
          await tx.insert(referralInvites).values({
            referrerUserId: referrer.userId,
            referredUserId: user.id,
            referralCodeUsed: cleanRefCode,
            pointsAwarded: 100,
            status: 'qualified',
          }).onConflictDoNothing()

          await tx
            .update(referralProfiles)
            .set({
              referralPoints: referrer.referralPoints + 100,
              successfulInvites: referrer.successfulInvites + 1,
              updatedAt: new Date(),
            })
            .where(eq(referralProfiles.userId, referrer.userId))
        }
      }

      // Delete used verification token
      await tx
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, cleanEmail))

      return user
    })

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      password: payload.password,
      userId: newUser.id,
    })
  } catch (error: any) {
    console.error('Email verify-otp error:', error)
    return NextResponse.json(
      { error: error?.message || 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}

