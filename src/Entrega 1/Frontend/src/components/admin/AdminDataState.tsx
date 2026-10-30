import type { ReactNode } from 'react'

export function AdminDataState({ loading, error, onRetry, empty = false, children }: {
  loading: boolean
  error: string | null
  onRetry: () => void
  empty?: boolean
  children?: ReactNode
}) {
  if (loading) return <p role="status" className="p-8 text-center text-gray-500 dark:text-slate-400">Carregando dados…</p>
  if (error) return <div role="alert" className="p-6 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"><p>{error}</p><button className="mt-3 underline" onClick={onRetry}>Tentar novamente</button></div>
  if (empty) return <p className="p-8 text-center text-gray-500 dark:text-slate-400">Nenhum registro encontrado.</p>
  return <>{children}</>
}
