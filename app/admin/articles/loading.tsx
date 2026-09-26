export default function Loading() {
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-10 w-36 rounded bg-muted animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-3">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-8 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <div className="h-10 w-full rounded bg-muted animate-pulse" />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-8 w-full rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
