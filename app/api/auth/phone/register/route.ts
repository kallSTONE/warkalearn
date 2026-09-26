import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import {
    normalizePhoneToE164,
    phoneE164ToLoginEmail,
    hashRegistrationTicketToken,
    decryptRegistrationTicketPassword,
} from '@/lib/phone-auth'

export const runtime = 'nodejs'

type RegistrationTicketRecord = {
    id: string
    phone_e164: string
    full_name: string
    password_encrypted: string
    referral_code: string | null
    expires_at: string
    consumed_at: string | null
}

function generatePasswordlessAuthPassword(): string {
    return randomBytes(24).toString('hex')
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const ticketToken =
            typeof body?.ticketToken === 'string' ? body.ticketToken.trim() : ''

        let phoneInput = body?.phone
        let passwordInput = body?.password
        let fullNameInput = body?.fullName
        let referralCodeInput = body?.referralCode

        const redirectTo =
            typeof body?.redirectTo === 'string' && body.redirectTo.trim().length > 0
                ? body.redirectTo.trim()
                : undefined

        const admin = getSupabaseAdminClient()
        let ticketId: string | null = null

        if (ticketToken) {
            const tokenHash = hashRegistrationTicketToken(ticketToken)

            const { data: ticket, error: ticketError } = await admin
                .from('phone_registration_tickets')
                .select(
                    'id, phone_e164, full_name, password_encrypted, referral_code, expires_at, consumed_at'
                )
                .eq('token_hash', tokenHash)
                .maybeSingle<RegistrationTicketRecord>()

            if (ticketError) {
                console.error('Registration ticket lookup error:', ticketError)
                return NextResponse.json(
                    { error: 'Unable to validate registration ticket.' },
                    { status: 500 }
                )
            }

            if (!ticket) {
                return NextResponse.json(
                    { error: 'Invalid or expired registration session. Start signup again.' },
                    { status: 403 }
                )
            }

            if (ticket.consumed_at) {
                return NextResponse.json(
                    { error: 'This registration session has already been used. Start again.' },
                    { status: 409 }
                )
            }

            if (new Date(ticket.expires_at).getTime() < Date.now()) {
                return NextResponse.json(
                    { error: 'Registration session expired. Start signup again.' },
                    { status: 403 }
                )
            }

            phoneInput = ticket.phone_e164
            fullNameInput = ticket.full_name
            passwordInput = decryptRegistrationTicketPassword(ticket.password_encrypted)
            referralCodeInput = ticket.referral_code
            ticketId = ticket.id
        }

        if (typeof phoneInput !== 'string' || typeof fullNameInput !== 'string') {
            return NextResponse.json(
                { error: 'Phone and full name are required.' },
                { status: 400 }
            )
        }

        const fullName = fullNameInput.trim()

        if (!fullName) {
            return NextResponse.json(
                { error: 'Full name is required.' },
                { status: 400 }
            )
        }

        if (
            typeof passwordInput === 'string' &&
            passwordInput.length > 0 &&
            passwordInput.length < 8
        ) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long.' },
                { status: 400 }
            )
        }

        const password =
            typeof passwordInput === 'string' && passwordInput.length > 0
                ? passwordInput
                : generatePasswordlessAuthPassword()

        const phoneE164 = normalizePhoneToE164(phoneInput)
        const phoneLoginEmail = phoneE164ToLoginEmail(phoneE164)

        const { data: verification, error: verificationError } = await admin
            .from('phone_verifications')
            .select('phone_e164, valid_until, consumed_at')
            .eq('phone_e164', phoneE164)
            .eq('purpose', 'register')
            .is('consumed_at', null)
            .maybeSingle()

        if (verificationError) {
            console.error('Verification lookup error:', verificationError)
            return NextResponse.json(
                { error: 'Unable to validate phone verification.' },
                { status: 500 }
            )
        }

        if (!verification) {
            return NextResponse.json(
                { error: 'Phone number is not verified. Complete OTP verification first.' },
                { status: 403 }
            )
        }

        if (new Date(verification.valid_until).getTime() < Date.now()) {
            return NextResponse.json(
                { error: 'Phone verification expired. Request and verify a new OTP.' },
                { status: 403 }
            )
        }

        const metadata: Record<string, unknown> = {
            full_name: fullName,
            auth_method: 'phone',
            phone_verified: true,
            phone_e164: phoneE164,
            phone_login_email: phoneLoginEmail,
        }

        if (typeof referralCodeInput === 'string' && referralCodeInput.trim().length > 0) {
            metadata.referral_code = referralCodeInput.trim().toUpperCase()
        }

        const { data: createData, error: createError } = await admin.auth.admin.createUser({
            phone: phoneE164,
            email: phoneLoginEmail,
            password,
            email_confirm: true,
            phone_confirm: true,
            user_metadata: metadata,
        })

        if (createError) {
            console.error('Phone register createUser error:', createError)
            return NextResponse.json(
                { error: createError.message ?? 'Failed to create account.' },
                { status: 400 }
            )
        }

        const nowIso = new Date().toISOString()
        const { error: consumeVerificationError } = await admin
            .from('phone_verifications')
            .update({ consumed_at: nowIso })
            .eq('phone_e164', phoneE164)
            .eq('purpose', 'register')

        if (consumeVerificationError) {
            console.error('Phone verification consume error:', consumeVerificationError)
        }

        if (ticketId) {
            const { error: consumeTicketError } = await admin
                .from('phone_registration_tickets')
                .update({ consumed_at: nowIso })
                .eq('id', ticketId)

            if (consumeTicketError) {
                console.error('Registration ticket consume error:', consumeTicketError)
            }
        }

        let magicLinkTokenHash: string | null = null

        const { data: magicLinkData, error: magicLinkError } = await admin.auth.admin.generateLink({
            type: 'magiclink',
            email: phoneLoginEmail,
            options: redirectTo ? { redirectTo } : undefined,
        })

        if (magicLinkError) {
            console.error('Phone register generateLink error:', magicLinkError)
        } else {
            magicLinkTokenHash = magicLinkData?.properties?.hashed_token ?? null
        }

        return NextResponse.json({
            success: true,
            userId: createData.user?.id,
            phone: phoneE164,
            magicLinkTokenHash,
        })
    } catch (error: any) {
        console.error('phone register route error:', error)
        return NextResponse.json(
            { error: error.message ?? 'Failed to create phone account.' },
            { status: 500 }
        )
    }
}
