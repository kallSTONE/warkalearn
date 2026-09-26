export default function Loading() {
    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            <div className="space-y-2">
                <div className="h-7 w-40 rounded bg-muted animate-pulse" />
                <div className="h-4 w-72 rounded bg-muted animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-3">
                        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
                    <div className="h-5 w-48 rounded bg-muted animate-pulse" />
                    <div className="h-64 w-full rounded bg-muted animate-pulse" />
                </div>
                <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
                    <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                    <div className="h-64 w-full rounded bg-muted animate-pulse" />
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
                <div className="h-5 w-44 rounded bg-muted animate-pulse" />
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-4 w-full rounded bg-muted animate-pulse" />
                ))}
            </div>
        </div>
    )
}
