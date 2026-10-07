import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, profiles, referralInvites, referralProfiles } from '@/db/schema'
import { isLikelyEmail, isLikelyPhone } from '@/lib/auth-identifier'
import { normalizePhoneToE164 } from '@/lib/phone-auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, email, phone, password, fullName, referralCode } = body

    const userFullName = (fullName || '').trim()
    if (!userFullName) {
      return NextResponse.json(
        { error: 'Full name is required.' },
        { status: 400 }
      )
    }

    const userPassword = (password || '')
    if (userPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    // Determine email or phone
    const targetIdentifier = (identifier || email || phone || '').trim()
    let userEmail: string | null = null
    let userPhone: string | null = null

    if (isLikelyEmail(targetIdentifier)) {
      userEmail = targetIdentifier.toLowerCase()
    } else if (isLikelyPhone(targetIdentifier)) {
      try {
        userPhone = normalizePhoneToE164(targetIdentifier)
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || 'Invalid phone number format.' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Please provide a valid email or phone number.' },
        { status: 400 }
      )
    }

    // Check if user already exists
    if (userEmail) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, userEmail),
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        )
      }
    }

    if (userPhone) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.phone, userPhone),
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists. Please sign in.' },
          { status: 409 }
        )
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userPassword, 10)

    // Create user and profile in transaction
    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email: userEmail,
          phone: userPhone,
          name: userFullName,
          passwordHash,
        })
        .returning()

      await tx.insert(profiles).values({
        id: newUser.id,
        fullName: userFullName,
        role: 'lawyer',
      })

      // Generate a referral code for this new user profile
      const userRefCode = userFullName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6) + Math.floor(1000 + Math.random() * 9000)

      await tx.insert(referralProfiles).values({
        userId: newUser.id,
        referralCode: userRefCode,
      }).onConflictDoNothing()

      // Handle referral code if provided
      if (referralCode && typeof referralCode === 'string') {
        const cleanRefCode = referralCode.trim().toUpperCase()
        const referrer = await tx.query.referralProfiles.findFirst({
          where: eq(referralProfiles.referralCode, cleanRefCode),
        })

        if (referrer && referrer.userId !== newUser.id) {
          await tx.insert(referralInvites).values({
            referrerUserId: referrer.userId,
            referredUserId: newUser.id,
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

      return newUser
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: result.id,
        email: result.email,
        phone: result.phone,
        name: result.name,
      },
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred during registration.' },
      { status: 500 }
    )
  }
}

