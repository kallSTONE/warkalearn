import { redirect } from 'next/navigation'

type SearchParams = Record<string, string | string[] | undefined>

function toQueryString(searchParams: SearchParams): string {
    const query = new URLSearchParams()

    Object.entries(searchParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => query.append(key, entry))
            return
        }

        if (typeof value === 'string') {
            query.set(key, value)
        }
    })

    return query.toString()
}

export default function AuthPage({
    searchParams = {},
}: {
    searchParams?: SearchParams
}) {
    const query = toQueryString(searchParams)
    const hasReferral =
        typeof searchParams.ref === 'string' || Array.isArray(searchParams.ref)
    const targetPath = hasReferral ? '/register' : '/login'

    redirect(query ? `${targetPath}?${query}` : targetPath)
}
