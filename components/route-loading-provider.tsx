"use client"
       
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
     
type RouteLoadingContextValue = {
    isLoading: boolean
    startLoading: () => void
}    
    
const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(null)
  
const FALLBACK_TIMEOUT_MS = 8000

export function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const searchKey = useMemo(() => searchParams.toString(), [searchParams])
    const [isLoading, setIsLoading] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])
   
    const startLoading = useCallback(() => {
        setIsLoading(true)
        clearTimer()
        timeoutRef.current = setTimeout(() => setIsLoading(false), FALLBACK_TIMEOUT_MS)
    }, [clearTimer])
   
    useEffect(() => {
        setIsLoading(false)
        clearTimer()
    }, [pathname, searchKey, clearTimer])
   
    const value = useMemo(() => ({ isLoading, startLoading }), [isLoading, startLoading])
   
    return <RouteLoadingContext.Provider value={value}>{children}</RouteLoadingContext.Provider>
}    
   
export function useRouteLoading() {
    const context = useContext(RouteLoadingContext)
    if (!context) {
        throw new Error("useRouteLoading must be used within RouteLoadingProvider")
    }
    return context
} 
      