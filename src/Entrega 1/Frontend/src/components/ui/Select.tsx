import { cn } from '../../lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function Select({
  label,
  error,
  hint,
  options,
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: SelectProps) {
  const selectId = label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'w-full rounded-lg border bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100',
          'border-gray-200 dark:border-slate-700',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'transition-colors duration-150',
          'px-3 py-2',
          error && 'border-red-400',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500 dark:text-slate-500">{hint}</p>}
    </div>
  )
}
