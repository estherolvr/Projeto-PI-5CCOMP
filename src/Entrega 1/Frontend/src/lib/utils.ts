import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date?: Date | string | number | null): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    if (!d || isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch {
    return ''
  }
}

export function formatDateTime(date?: Date | string | number | null): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    if (!d || isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

export function formatRelative(date?: Date | string | number | null): string {
  if (!date) return 'Recente'
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    if (!d || isNaN(d.getTime())) return 'Recente'
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMin / 60)
    const diffD = Math.floor(diffH / 24)

    if (diffMin < 1) return 'Agora'
    if (diffMin < 60) return `${diffMin}min atrás`
    if (diffH < 24) return `${diffH}h atrás`
    if (diffD === 1) return 'Ontem'
    if (diffD < 7) return `${diffD} dias atrás`
    return formatDate(d)
  } catch {
    return 'Recente'
  }
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'AA'
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
