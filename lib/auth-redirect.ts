const ROLE_REDIRECTS: Record<string, string> = {
    admin: '/admin/dashboard',
    reviewer: '/reviewer',
    student: '/dashboard',
    lawyer: '/dashboard',
    mentor: '/dashboard',
}

export function resolvePostLoginRedirect(role?: string | null): string {
    if (typeof window !== 'undefined') {
        const redirectPath = window.localStorage.getItem('redirectAfterLogin')
        if (redirectPath) {
            window.localStorage.removeItem('redirectAfterLogin')
            // Don't send admins to student dashboard or students to admin dashboard
            if (role === 'admin' && (redirectPath === '/dashboard' || redirectPath === '/dashboard/')) {
                return '/admin/dashboard'
            }
            if (role !== 'admin' && redirectPath.startsWith('/admin')) {
                return '/dashboard'
            }
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
