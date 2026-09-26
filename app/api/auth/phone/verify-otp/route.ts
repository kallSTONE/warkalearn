import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import {
    normalizePhoneToE164,
    hashOtpCode,
    isOtpPurposeValid,
} from '@/lib/phone-auth'

const VERIFICATION_TTL_MINUTES = 30

export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const phoneInput = body?.phone
        const otpCode = body?.otp
        const purpose = body?.purpose ?? 'register'

        if (typeof phoneInput !== 'string' || typeof otpCode !== 'string') {
            return NextResponse.json(
                { error: 'Phone number and OTP are required.' },
                { status: 400 }
            )
        }

        if (!isOtpPurposeValid(purpose)) {
            return NextResponse.json({ error: 'Invalid OTP purpose.' }, { status: 400 })
        }

        const phoneE164 = normalizePhoneToE164(phoneInput)
        const admin = getSupabaseAdminClient()

        const { data: challenge, error: challengeError } = await admin
            .from('phone_otp_challenges')
            .select('id, otp_hash, attempts, max_attempts, expires_at, consumed_at')
            .eq('phone_e164', phoneE164)
            .eq('purpose', purpose)
            .is('consumed_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (challengeError) {
            console.error('OTP verify lookup error:', challengeError)
            return NextResponse.json(
                { error: 'Unable to verify OTP right now.' },
                { status: 500 }
            )
        }

        if (!challenge) {
            return NextResponse.json(
                { error: 'No active OTP challenge found. Request a new code.' },
                { status: 404 }
            )
        }

        if (new Date(challenge.expires_at).getTime() < Date.now()) {
            return NextResponse.json(
                { error: 'OTP has expired. Request a new code.' },
                { status: 400 }
            )
        }

        if (challenge.attempts >= challenge.max_attempts) {
            return NextResponse.json(
                { error: 'Maximum OTP attempts reached. Request a new code.' },
                { status: 429 }
            )
        }

        const expectedHash = hashOtpCode(phoneE164, otpCode.trim())
        const nextAttempts = challenge.attempts + 1

        if (expectedHash !== challenge.otp_hash) {
            const { error: attemptUpdateError } = await admin
                .from('phone_otp_challenges')
                .update({ attempts: nextAttempts })
                .eq('id', challenge.id)

            if (attemptUpdateError) {
                console.error('OTP attempt update error:', attemptUpdateError)
            }

            return NextResponse.json(
                {
                    error: 'Invalid verification code.',
                    remainingAttempts: Math.max(challenge.max_attempts - nextAttempts, 0),
                },
                { status: 400 }
            )
        }

        const nowIso = new Date().toISOString()
        const validUntil = new Date(
            Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000
        ).toISOString()

        const { error: consumeError } = await admin
            .from('phone_otp_challenges')
            .update({ attempts: nextAttempts, consumed_at: nowIso })
            .eq('id', challenge.id)

        if (consumeError) {
            console.error('OTP consume error:', consumeError)
            return NextResponse.json(
                { error: 'Failed to complete OTP verification.' },
                { status: 500 }
            )
        }

        const { error: verificationUpsertError } = await admin
            .from('phone_verifications')
            .upsert({
                phone_e164: phoneE164,
                purpose,
                verified_at: nowIso,
                valid_until: validUntil,
                challenge_id: challenge.id,
                consumed_at: null,
            })

        if (verificationUpsertError) {
            console.error('Phone verification upsert error:', verificationUpsertError)
            return NextResponse.json(
                { error: 'Failed to record phone verification.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            phone: phoneE164,
            validUntil,
        })
    } catch (error: any) {
        console.error('verify-otp route error:', error)
        return NextResponse.json(
            { error: error.message ?? 'Failed to verify OTP.' },
            { status: 500 }
        )
    }
}
