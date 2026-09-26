import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import {
    normalizePhoneToE164,
    phoneE164ToLoginEmail,
    generateRegistrationTicketToken,
    hashRegistrationTicketToken,
    encryptRegistrationTicketPassword,
    maskPhone,
} from '@/lib/phone-auth'

const REGISTRATION_TICKET_TTL_MINUTES = 30
const LIST_USERS_PAGE_SIZE = 200
const LIST_USERS_MAX_PAGES = 20

type AdminClient = ReturnType<typeof getSupabaseAdminClient>

function normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const trimmedValue = value.trim()
    return trimmedValue.length > 0 ? trimmedValue : null
}

function normalizeOptionalStringLower(value: unknown): string | null {
    const normalizedValue = normalizeOptionalString(value)
    return normalizedValue ? normalizedValue.toLowerCase() : null
}

function getUserMetadata(user: User): Record<string, unknown> {
    if (typeof user.user_metadata === 'object' && user.user_metadata !== null) {
        return user.user_metadata as Record<string, unknown>
    }

    return {}
}

function isPhoneLoginUserMatch(user: User, phoneE164: string, loginEmail: string): boolean {
    const loginEmailLower = loginEmail.toLowerCase()
    const metadata = getUserMetadata(user)

    const userPhone = normalizeOptionalString(user.phone)
    const userEmailLower = normalizeOptionalStringLower(user.email)
    const metadataPhone = normalizeOptionalString(metadata.phone_e164)
    const metadataLoginEmailLower = normalizeOptionalStringLower(metadata.phone_login_email)

    return (
        userPhone === phoneE164 ||
        userEmailLower === loginEmailLower ||
        metadataPhone === phoneE164 ||
        metadataLoginEmailLower === loginEmailLower
    )
}

async function findUserByPhone(
    admin: AdminClient,
    phoneE164: string,
    loginEmail: string
): Promise<User | null> {
    for (let page = 1; page <= LIST_USERS_MAX_PAGES; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({
            page,
            perPage: LIST_USERS_PAGE_SIZE,
        })

        if (error) {
            throw error
        }

        const users = data?.users ?? []
        const matchedUser = users.find((candidate) =>
            isPhoneLoginUserMatch(candidate, phoneE164, loginEmail)
        )

        if (matchedUser) {
            return matchedUser
        }

        if (users.length < LIST_USERS_PAGE_SIZE) {
            break
        }
    }

    return null
}

export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const phoneInput = body?.phone
        const fullNameInput = body?.fullName
        const passwordInput = body?.password
        const referralCodeInput = body?.referralCode

        if (
            typeof phoneInput !== 'string' ||
            typeof fullNameInput !== 'string' ||
            typeof passwordInput !== 'string'
        ) {
            return NextResponse.json(
                { error: 'Phone number, full name, and password are required.' },
                { status: 400 }
            )
        }

        const fullName = fullNameInput.trim()
        if (!fullName) {
            return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
        }

        if (passwordInput.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long.' },
                { status: 400 }
            )
        }

        const phoneE164 = normalizePhoneToE164(phoneInput)
        const loginEmail = phoneE164ToLoginEmail(phoneE164)
        const admin = getSupabaseAdminClient()

        const matchedUser = await findUserByPhone(admin, phoneE164, loginEmail)

        if (matchedUser) {
            return NextResponse.json(
                { error: 'An account with this phone already exists. Please sign in.' },
                { status: 409 }
            )
        }

        const ticketToken = generateRegistrationTicketToken()
        const tokenHash = hashRegistrationTicketToken(ticketToken)
        const encryptedPassword = encryptRegistrationTicketPassword(passwordInput)

        const referralCode =
            typeof referralCodeInput === 'string' && referralCodeInput.trim().length > 0
                ? referralCodeInput.trim().toUpperCase()
                : null

        const expiresAt = new Date(
            Date.now() + REGISTRATION_TICKET_TTL_MINUTES * 60 * 1000
        ).toISOString()

        const forwardedFor = request.headers.get('x-forwarded-for')
        const requestIp = forwardedFor?.split(',')[0]?.trim() ?? null
        const userAgent = request.headers.get('user-agent')

        const { error: insertError } = await admin.from('phone_registration_tickets').insert({
            token_hash: tokenHash,
            phone_e164: phoneE164,
            full_name: fullName,
            password_encrypted: encryptedPassword,
            referral_code: referralCode,
            requested_ip: requestIp,
            user_agent: userAgent,
            expires_at: expiresAt,
        })

        if (insertError) {
            console.error('start-register ticket insert error:', insertError)
            return NextResponse.json(
                { error: 'Unable to start registration right now.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            ticketToken,
            phone: phoneE164,
            maskedPhone: maskPhone(phoneE164),
            expiresInSeconds: REGISTRATION_TICKET_TTL_MINUTES * 60,
        })
    } catch (error: any) {
        console.error('start-register route error:', error)
        return NextResponse.json(
            { error: error.message ?? 'Unable to start registration.' },
            { status: 500 }
        )
    }
}
