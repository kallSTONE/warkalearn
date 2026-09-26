"use client"
    
import type React from "react"
  
import { motion } from "framer-motion"
   
interface PageHeaderProps {
  title: string 
  description?: string
  action?: React.ReactNode
}   
   
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between mb-8"
    >    
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  )
}   
   