"use client"

import React, { MouseEvent } from "react"
import Link, { LinkProps } from "next/link"
import { useRouteLoading } from "@/components/route-loading-provider"
     
type TransitionLinkProps = LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>
  
const TransitionLink = React.forwardRef<HTMLAnchorElement, TransitionLinkProps>(
    ({ onClick, target, ...props }, ref) => {
        const { startLoading } = useRouteLoading()

        const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
            onClick?.(event)
            if (event.defaultPrevented) return
            if (event.button !== 0) return
            if (target && target !== "_self") return
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            startLoading()
        }

        return <Link ref={ref} onClick={handleClick} target={target} {...props} />
    },
) 
 
TransitionLink.displayName = "TransitionLink"
 
export default TransitionLink
 