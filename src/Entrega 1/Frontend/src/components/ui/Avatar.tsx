import { cn } from '../../lib/utils'
import { getInitials } from '../../lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarStatus = 'online' | 'offline' | 'busy'

interface AvatarProps {
  name: string
  src?: string
  size?: AvatarSize
  status?: AvatarStatus
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const statusDotSizes: Record<AvatarSize, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
}

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-brand-500',
  offline: 'bg-gray-400',
  busy: 'bg-amber-500',
}

// Deterministic color based on name
function getBgColor(name: string): string {
  const colors = [
    'bg-brand-600',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  const initials = getInitials(name)
  const bgColor = getBgColor(name)

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white select-none',
            sizeClasses[size],
            bgColor
          )}
          title={name}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-800',
            statusDotSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  )
}
