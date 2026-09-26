import {
    createHash,
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from 'crypto'

const ETHIOPIA_COUNTRY_CODE = '+251'
const PHONE_LOGIN_EMAIL_DOMAIN = 'phone.bronqenglish.local'

export function normalizePhoneToE164(input: string): string {
    const raw = input.trim().replace(/[\s()-]/g, '')

    if (!raw) {
        throw new Error('Phone number is required')
    }

    if (raw.startsWith('00')) {
        const converted = `+${raw.slice(2)}`
        return validateE164(converted)
    }

    if (raw.startsWith('+')) {
        return validateE164(raw)
    }

    const digits = raw.replace(/\D/g, '')

    if (digits.startsWith('251') && digits.length === 12) {
        return validateE164(`+${digits}`)
    }

    if (digits.startsWith('0') && digits.length === 10) {
        return validateE164(`${ETHIOPIA_COUNTRY_CODE}${digits.slice(1)}`)
    }

    if (digits.length === 9) {
        return validateE164(`${ETHIOPIA_COUNTRY_CODE}${digits}`)
    }

    return validateE164(`+${digits}`)
}

export function maskPhone(phoneE164: string): string {
    if (phoneE164.length <= 6) return phoneE164
    return `${phoneE164.slice(0, 4)}***${phoneE164.slice(-3)}`
}

export function generateOtpCode(length = 6): string {
    const max = 10 ** length
    const min = 10 ** (length - 1)
    return String(Math.floor(Math.random() * (max - min) + min))
}

export function hashOtpCode(phoneE164: string, otp: string): string {
    const secret = process.env.PHONE_OTP_HASH_SECRET
    if (!secret) {
        throw new Error('PHONE_OTP_HASH_SECRET is required')
    }

    return createHash('sha256')
        .update(`${phoneE164}|${otp}|${secret}`)
        .digest('hex')
}

export function generateRegistrationTicketToken(): string {
    return randomBytes(32).toString('base64url')
}

export function hashRegistrationTicketToken(token: string): string {
    const secret = getRegistrationTicketSecret()

    return createHash('sha256')
        .update(`${token}|${secret}`)
        .digest('hex')
}

export function encryptRegistrationTicketPassword(password: string): string {
    const secret = getRegistrationTicketSecret()
    const key = createHash('sha256').update(secret).digest()
    const iv = randomBytes(12)

    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptRegistrationTicketPassword(payload: string): string {
    const secret = getRegistrationTicketSecret()
    const key = createHash('sha256').update(secret).digest()
    const [ivPart, authTagPart, encryptedPart] = payload.split('.')

    if (!ivPart || !authTagPart || !encryptedPart) {
        throw new Error('Invalid registration ticket payload.')
    }

    const iv = Buffer.from(ivPart, 'base64url')
    const authTag = Buffer.from(authTagPart, 'base64url')
    const encrypted = Buffer.from(encryptedPart, 'base64url')

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
}

export function isOtpPurposeValid(purpose: string): boolean {
    return ['register', 'login', 'reset'].includes(purpose)
}

export function phoneE164ToLoginEmail(phoneE164: string): string {
    const normalizedPhone = validateE164(phoneE164)
    const phoneDigits = normalizedPhone.replace(/\D/g, '')
    return `phone.${phoneDigits}@${PHONE_LOGIN_EMAIL_DOMAIN}`
}

function validateE164(phone: string): string {
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        throw new Error('Invalid phone number format. Use a valid mobile number.')
    }

    return phone
}

function getRegistrationTicketSecret(): string {
    const secret =
        process.env.PHONE_REGISTRATION_TICKET_SECRET ?? process.env.PHONE_OTP_HASH_SECRET

    if (!secret) {
        throw new Error(
            'PHONE_REGISTRATION_TICKET_SECRET (or PHONE_OTP_HASH_SECRET) is required'
        )
    }

    return secret
}
