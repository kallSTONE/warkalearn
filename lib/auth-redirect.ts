const ROLE_REDIRECTS: Record<string, string> = {
    admin: '/admin/dashboard',
    reviewer: '/reviewer',
    lawyer: '/dashboard',
    mentor: '/dashboard',
}

export function resolvePostLoginRedirect(role?: string | null): string {
    if (typeof window !== 'undefined') {
        const redirectPath = window.localStorage.getItem('redirectAfterLogin')
        if (redirectPath) {
            window.localStorage.removeItem('redirectAfterLogin')
            return redirectPath
        }
    }

    if (!role) return '/dashboard'
    return ROLE_REDIRECTS[role] ?? '/dashboard'
}

export function setPostLoginRedirect(path: string): void {
    if (typeof window === 'undefined') return
    if (!path) return

    window.localStorage.setItem('redirectAfterLogin', path)
}
