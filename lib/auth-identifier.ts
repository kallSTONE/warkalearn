export type IdentifierKind = 'phone' | 'email'

export function isLikelyEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isLikelyPhone(value: string): boolean {
    const trimmed = value.trim()

    if (!trimmed || trimmed.includes('@')) {
        return false
    }

    const normalized = trimmed.replace(/[\s()-]/g, '')

    if (normalized.startsWith('+') && !/^\+\d+$/.test(normalized)) {
        return false
    }

    const digits = normalized.replace(/\D/g, '')
    return digits.length >= 9 && digits.length <= 15
}

export function detectIdentifierKind(value: string): IdentifierKind | null {
    const trimmed = value.trim()

    if (!trimmed) return null

    if (trimmed.includes('@')) {
        return isLikelyEmail(trimmed) ? 'email' : null
    }

    return isLikelyPhone(trimmed) ? 'phone' : null
}

export function maskEmail(email: string): string {
    const [localPart = '', domain = ''] = email.split('@')

    if (!domain) return email

    if (localPart.length <= 2) {
        return `${localPart.slice(0, 1)}***@${domain}`
    }

    return `${localPart.slice(0, 2)}***@${domain}`
}