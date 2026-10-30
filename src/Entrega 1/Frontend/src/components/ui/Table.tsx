import React from 'react'
import { cn } from '../../lib/utils'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function TableHead({ children, className }: TableProps) {
  return (
    <thead className={cn('bg-gray-50 dark:bg-slate-800/50', className)}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn('divide-y divide-gray-100 dark:divide-slate-700/50', className)}>{children}</tbody>
}

export function TableRow({ children, className, onClick }: TableProps & { onClick?: () => void }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap',
        className
      )}
    >
      {children}
    </th>
  )
}

export function TableCell({ children, className }: TableProps) {
  return (
    <td className={cn('px-4 py-3 text-gray-700 dark:text-slate-300', className)}>
      {children}
    </td>
  )
}

export default Table
