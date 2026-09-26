export default function Loading() {
    return (
        <div className="container px-4 sm:px-6 lg:px-10 py-6 md:py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-3 md:gap-4">
                <div className="space-y-3">
                    <div className="h-7 md:h-8 w-52 md:w-60 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-72 rounded bg-muted animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-10 w-32 rounded bg-muted animate-pulse" />
                </div> 
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
                            <div className="h-5 w-48 rounded bg-muted animate-pulse" />
                            <div className="h-3 w-full rounded bg-muted animate-pulse" />
                            <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
                            <div className="h-10 w-full rounded bg-muted animate-pulse" />
                        </div>
                    ))}
                </div>

                <div className="space-y-4 md:space-y-6">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
                            <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                            <div className="space-y-3">
                                <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
