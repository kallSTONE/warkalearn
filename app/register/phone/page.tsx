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

export default function PhoneRegisterPage({
    searchParams = {},
}: {
    searchParams?: SearchParams
}) {
    const query = toQueryString(searchParams)
    redirect(query ? `/register?${query}` : '/register')
}
