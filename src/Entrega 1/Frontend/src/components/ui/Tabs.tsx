import React from 'react'
import { cn } from '../../lib/utils'

interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  variant?: 'line' | 'pill'
  className?: string
}

export default function Tabs({ tabs, active, onChange, variant = 'line', className }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('flex gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              tab.id === active
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                tab.id === active
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex border-b border-gray-200 dark:border-slate-700', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors duration-150',
            tab.id === active
              ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              tab.id === active
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
