import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import {
    normalizePhoneToE164,
    phoneE164ToLoginEmail,
    isOtpPurposeValid,
} from '@/lib/phone-auth'

const LIST_USERS_PAGE_SIZE = 200
const LIST_USERS_MAX_PAGES = 20

type AdminClient = ReturnType<typeof getSupabaseAdminClient>

type PhoneVerificationRecord = {
    id: string
    valid_until: string
    consumed_at: string | null
}

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

async function findUserByPhone(admin: AdminClient, phoneE164: string, loginEmail: string): Promise<User | null> {
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

function getUserMetadata(user: User): Record<string, unknown> {
    if (typeof user.user_metadata === 'object' && user.user_metadata !== null) {
        return user.user_metadata as Record<string, unknown>
    }

    return {}
}

export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const phoneInput = body?.phone
        const requireVerified = body?.requireVerified === true
        const issueMagicLink = body?.issueMagicLink === true
        const verificationPurpose =
            typeof body?.verificationPurpose === 'string'
                ? body.verificationPurpose
                : 'register'
        const redirectTo =
            typeof body?.redirectTo === 'string' && body.redirectTo.trim().length > 0
                ? body.redirectTo.trim()
                : undefined

        if (typeof phoneInput !== 'string') {
            return NextResponse.json(
                { error: 'Phone number is required.' },
                { status: 400 }
            )
        }

        if (requireVerified && !isOtpPurposeValid(verificationPurpose)) {
            return NextResponse.json(
                { error: 'Invalid OTP purpose.' },
                { status: 400 }
            )
        }

        const phoneE164 = normalizePhoneToE164(phoneInput)
        const loginEmail = phoneE164ToLoginEmail(phoneE164)
        const admin = getSupabaseAdminClient()

        const matchedUser = await findUserByPhone(admin, phoneE164, loginEmail)

        let resolvedLoginEmail = matchedUser?.email ?? loginEmail

        if (matchedUser && !matchedUser.email) {
            const existingMetadata = getUserMetadata(matchedUser)
            const { error: updateError } = await admin.auth.admin.updateUserById(matchedUser.id, {
                email: loginEmail,
                email_confirm: true,
                user_metadata: {
                    ...existingMetadata,
                    phone_e164: phoneE164,
                    phone_login_email: loginEmail,
                },
            })

            if (updateError) {
                console.error('prepare-login updateUserById error:', updateError)
                return NextResponse.json(
                    { error: 'Failed to prepare account for phone login.' },
                    { status: 500 }
                )
            }

            resolvedLoginEmail = loginEmail
        }

        let verificationRecord: PhoneVerificationRecord | null = null

        if (requireVerified) {
            const { data: verification, error: verificationError } = await admin
                .from('phone_verifications')
                .select('id, valid_until, consumed_at')
                .eq('phone_e164', phoneE164)
                .eq('purpose', verificationPurpose)
                .is('consumed_at', null)
                .maybeSingle()

            if (verificationError) {
                console.error('prepare-login verification lookup error:', verificationError)
                return NextResponse.json(
                    { error: 'Unable to validate phone verification.' },
                    { status: 500 }
                )
            }

            if (!verification) {
                return NextResponse.json(
                    { error: 'Phone verification required. Request and verify a new OTP.' },
                    { status: 403 }
                )
            }

            if (new Date(verification.valid_until).getTime() < Date.now()) {
                return NextResponse.json(
                    { error: 'Phone verification expired. Request and verify a new OTP.' },
                    { status: 403 }
                )
            }

            verificationRecord = verification
        }

        const userExists = Boolean(matchedUser)
        let magicLinkTokenHash: string | null = null

        if (issueMagicLink && matchedUser) {
            const { data: magicLinkData, error: magicLinkError } = await admin.auth.admin.generateLink({
                type: 'magiclink',
                email: resolvedLoginEmail,
                options: redirectTo ? { redirectTo } : undefined,
            })

            if (magicLinkError) {
                console.error('prepare-login generateLink error:', magicLinkError)
                return NextResponse.json(
                    { error: 'Unable to issue secure login link.' },
                    { status: 500 }
                )
            }

            magicLinkTokenHash = magicLinkData?.properties?.hashed_token ?? null

            if (!magicLinkTokenHash) {
                return NextResponse.json(
                    { error: 'Unable to issue secure login link.' },
                    { status: 500 }
                )
            }

            if (verificationRecord) {
                const { error: consumeVerificationError } = await admin
                    .from('phone_verifications')
                    .update({ consumed_at: new Date().toISOString() })
                    .eq('id', verificationRecord.id)

                if (consumeVerificationError) {
                    console.error(
                        'prepare-login verification consume error:',
                        consumeVerificationError
                    )
                }
            }
        }

        return NextResponse.json({
            success: true,
            phone: phoneE164,
            loginEmail: resolvedLoginEmail,
            userExists,
            magicLinkTokenHash,
        })
    } catch (error: any) {
        console.error('prepare-login route error:', error)
        return NextResponse.json(
            { error: error.message ?? 'Failed to prepare phone login.' },
            { status: 500 }
        )
    }
}
