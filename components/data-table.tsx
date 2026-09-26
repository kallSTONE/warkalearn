"use client"

import type React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion } from "framer-motion"

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any, item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  actions?: (item: T) => React.ReactNode
}

export function DataTable<T extends { id: string | number }>({ columns, data, actions }: DataTableProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="border rounded-lg overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={String(col.key)}>{col.label}</TableHead>
            ))}
            {actions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <motion.tr
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="hover:bg-muted/50 transition-colors"
            >
              {columns.map((col) => (
                <TableCell key={String(col.key)}>
                  {col.render ? col.render(item[col.key], item) : String(item[col.key])}
                </TableCell>
              ))}
              {actions && <TableCell>{actions(item)}</TableCell>}
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  )
}
