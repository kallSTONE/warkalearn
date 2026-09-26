import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import {
    normalizePhoneToE164,
    generateOtpCode,
    hashOtpCode,
    isOtpPurposeValid,
    maskPhone,
} from '@/lib/phone-auth'

const OTP_EXPIRY_MINUTES = 10
const OTP_COOLDOWN_SECONDS = 60
const OTP_MAX_PER_HOUR = 6

type SupabaseQueryError = {
    code?: string
    message?: string
    details?: string
    hint?: string
}

function getStorageFailureResponse(error: SupabaseQueryError) {
    const errorCode = (error.code ?? '').toUpperCase()
    const normalizedMessage = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()

    if (
        errorCode === '42P01' ||
        (normalizedMessage.includes('relation') && normalizedMessage.includes('does not exist'))
    ) {
        return NextResponse.json(
            {
                error:
                    'Phone auth tables are missing. Apply migration supabase/migrations/20260317_smsportal_phone_auth.sql and retry.',
            },
            { status: 500 }
        )
    }

    if (
        errorCode === '42501' ||
        normalizedMessage.includes('permission denied') ||
        normalizedMessage.includes('row-level security')
    ) {
        return NextResponse.json(
            {
                error:
                    'Database permission issue for phone auth. Verify SUPABASE_SERVICE_ROLE_KEY is present and valid.',
            },
            { status: 500 }
        )
    }

    if (
        normalizedMessage.includes('jwt') ||
        normalizedMessage.includes('invalid api key') ||
        normalizedMessage.includes('invalid key')
    ) {
        return NextResponse.json(
            {
                error:
                    'Supabase admin authentication failed. Check SUPABASE_SERVICE_ROLE_KEY and restart the server.',
            },
            { status: 500 }
        )
    }

    return NextResponse.json(
        { error: 'Unable to process OTP request right now.' },
        { status: 500 }
    )
}

function buildInfobipSendUrl(baseUrl: string) {
    const normalizedBaseUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(baseUrl)
        ? baseUrl
        : `https://${baseUrl}`

    const parsedBaseUrl = new URL(normalizedBaseUrl)
    parsedBaseUrl.pathname = '/sms/2/text/advanced'
    parsedBaseUrl.search = ''
    parsedBaseUrl.hash = ''

    return parsedBaseUrl.toString()
}

export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const phoneInput = body?.phone
        const purpose = body?.purpose ?? 'register'

        if (typeof phoneInput !== 'string') {
            return NextResponse.json(
                { error: 'Phone number is required.' },
                { status: 400 }
            )
        }

        if (!isOtpPurposeValid(purpose)) {
            return NextResponse.json({ error: 'Invalid OTP purpose.' }, { status: 400 })
        }

        const phoneE164 = normalizePhoneToE164(phoneInput)
        const admin = getSupabaseAdminClient()

        const { data: lastChallenge, error: lastChallengeError } = await admin
            .from('phone_otp_challenges')
            .select('created_at')
            .eq('phone_e164', phoneE164)
            .eq('purpose', purpose)
            .is('consumed_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (lastChallengeError) {
            console.error('OTP lookup error:', lastChallengeError)
            return getStorageFailureResponse(lastChallengeError)
        }

        if (lastChallenge?.created_at) {
            const secondsSinceLast =
                (Date.now() - new Date(lastChallenge.created_at).getTime()) / 1000

            if (secondsSinceLast < OTP_COOLDOWN_SECONDS) {
                return NextResponse.json(
                    {
                        error: 'Please wait before requesting another OTP.',
                        retryAfterSeconds: Math.ceil(OTP_COOLDOWN_SECONDS - secondsSinceLast),
                    },
                    { status: 429 }
                )
            }
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const { count, error: countError } = await admin
            .from('phone_otp_challenges')
            .select('*', { count: 'exact', head: true })
            .eq('phone_e164', phoneE164)
            .gte('created_at', oneHourAgo)

        if (countError) {
            console.error('OTP count error:', countError)
            return getStorageFailureResponse(countError)
        }

        if ((count ?? 0) >= OTP_MAX_PER_HOUR) {
            return NextResponse.json(
                { error: 'Too many OTP requests. Please try again later.' },
                { status: 429 }
            )
        }

        const infobipBaseUrl = process.env.INFOBIP_BASE_URL?.trim()
        const infobipApiKey = process.env.INFOBIP_API_KEY?.trim()
        const infobipSenderId = process.env.INFOBIP_SENDER_ID?.trim() || 'InfoSMS'

        if (!infobipBaseUrl || !infobipApiKey) {
            return NextResponse.json(
                {
                    error:
                        'SMS provider credentials are missing. Set INFOBIP_BASE_URL and INFOBIP_API_KEY.',
                },
                { status: 500 }
            )
        }

        const otp = generateOtpCode(6)
        const otpHash = hashOtpCode(phoneE164, otp)
        const expiresAt = new Date(
            Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
        ).toISOString()

        const messageText = `Bronq English verification code: ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`

        let infobipSendUrl: string

        try {
            infobipSendUrl = buildInfobipSendUrl(infobipBaseUrl)
        } catch (urlError) {
            console.error('Invalid INFOBIP_BASE_URL:', urlError)
            return NextResponse.json(
                {
                    error:
                        'Invalid INFOBIP_BASE_URL. Use a valid Infobip hostname or HTTPS URL.',
                },
                { status: 500 }
            )
        }

        const smsResponse = await fetch(infobipSendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `App ${infobipApiKey}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        destinations: [{ to: phoneE164 }],
                        from: infobipSenderId,
                        text: messageText,
                    },
                ],
            }),
        })

        const smsResponseJson = await smsResponse.json().catch(() => null)

        if (!smsResponse.ok) {
            console.error('Infobip send failed:', smsResponse.status, smsResponseJson)

            const providerError =
                smsResponseJson?.requestError?.serviceException?.text ??
                smsResponseJson?.requestError?.policyException?.text ??
                'Failed to send verification code. Please try again.'

            return NextResponse.json(
                { error: providerError },
                { status: 502 }
            )
        }

        const providerMessageId =
            smsResponseJson?.messages?.[0]?.messageId ??
            smsResponseJson?.messages?.[0]?.message_id ??
            smsResponseJson?.messages?.[0]?.id ??
            null

        const forwardedFor = request.headers.get('x-forwarded-for')
        const requestIp = forwardedFor?.split(',')[0]?.trim() ?? null
        const userAgent = request.headers.get('user-agent')

        const { error: insertError } = await admin.from('phone_otp_challenges').insert({
            phone_e164: phoneE164,
            purpose,
            otp_hash: otpHash,
            expires_at: expiresAt,
            requested_ip: requestIp,
            user_agent: userAgent,
            sms_provider: 'infobip',
            provider_message_id: providerMessageId,
            provider_response: smsResponseJson,
        })

        if (insertError) {
            console.error('OTP insert error:', insertError)
            return NextResponse.json(
                { error: 'Unable to store verification challenge.' },
                { status: 500 }
            )
        }

        const payload: Record<string, unknown> = {
            success: true,
            phone: phoneE164,
            maskedPhone: maskPhone(phoneE164),
            expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
            retryAfterSeconds: OTP_COOLDOWN_SECONDS,
        }

        if (process.env.PHONE_AUTH_DEBUG_OTP === 'true') {
            payload.debugOtp = otp
        }

        return NextResponse.json(payload)
    } catch (error: any) {
        console.error('request-otp route error:', error)
        return NextResponse.json(
            { error: error.message ?? 'Failed to request OTP.' },
            { status: 500 }
        )
    }
}
