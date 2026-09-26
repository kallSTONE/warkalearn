export default function Loading() {
    return (
        <div className="min-h-[60vh] w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            </div> 
        </div> 
    )  
}
