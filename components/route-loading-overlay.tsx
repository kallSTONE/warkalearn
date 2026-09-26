"use client"

import { useRouteLoading } from "@/components/route-loading-provider"
import { cn } from "@/lib/utils"

export default function RouteLoadingOverlay() {
    const { isLoading } = useRouteLoading()

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm transition-opacity duration-200",
                isLoading ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={!isLoading}
        >
            <div className="absolute left-0 right-0 top-0 h-1 bg-primary/15 overflow-hidden">
                <div className="h-full w-1/2 bg-primary animate-[route-bar_1.25s_ease-in-out_infinite]" />
            </div>
            <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                    Loading...
                </p>
            </div>
        </div>
    )
}
