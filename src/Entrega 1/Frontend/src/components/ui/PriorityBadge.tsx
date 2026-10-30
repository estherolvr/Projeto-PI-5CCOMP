import { AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { TicketPriority } from '../../lib/mock-data'

interface PriorityBadgeProps {
  priority: TicketPriority
  showIcon?: boolean
  className?: string
}

const config: Record<TicketPriority, {
  label: string
  className: string
  icon: React.ReactNode
}> = {
  critica: {
    label: 'Crítica',
    className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  alta: {
    label: 'Alta',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: <ArrowUp className="w-3 h-3" />,
  },
  media: {
    label: 'Média',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: <Minus className="w-3 h-3" />,
  },
  baixa: {
    label: 'Baixa',
    className: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
    icon: <ArrowDown className="w-3 h-3" />,
  },
}

export default function PriorityBadge({ priority, showIcon = true, className }: PriorityBadgeProps) {
  const { label, className: variantClass, icon } = config[priority] ?? config.baixa
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        variantClass,
        className
      )}
    >
      {showIcon && icon}
      {label}
    </span>
  )
}
