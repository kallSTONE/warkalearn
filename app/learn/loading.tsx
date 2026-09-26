export default function Loading() {
    return (
        <div className="container p-6">
            <div className="mb-8 space-y-3">
                <div className="h-8 w-48 rounded bg-muted animate-pulse" />
                <div className="h-4 w-64 rounded bg-muted animate-pulse" />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-1/4">
                    <div className="sticky top-24 space-y-6">
                        <div className="h-10 w-full rounded bg-muted animate-pulse" />
                        <div className="space-y-4">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                            ))}
                        </div>
                        <div className="h-10 w-full rounded bg-muted animate-pulse" />
                        <div className="space-y-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-border bg-card p-4 space-y-4">
                            <div className="h-36 w-full rounded-lg bg-muted animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                                <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="flex gap-2">
                                <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                                <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-9 w-full rounded bg-muted animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
