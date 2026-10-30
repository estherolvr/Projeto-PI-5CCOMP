import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from './AdminDataState'

export default function AdminNotifications() {
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const query = useAdminQuery(api.admin.getNotifications)
  const unread = query.data?.filter(n => !n.read).length || 0
  const markRead = async (id: string) => {
    try { setActionError(null); await api.admin.markNotificationRead(id); await query.refresh() }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Não foi possível atualizar a notificação.') }
  }
  return <div className="relative">
    <button aria-label="Notificações" aria-expanded={open} onClick={() => setOpen(!open)} className="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"><Bell className="w-4 h-4" />{unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] px-1">{unread}</span>}</button>
    {open && <section aria-label="Notificações recentes" className="fixed right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-auto bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl p-4">
      <div className="flex justify-between mb-3"><h2 className="font-semibold dark:text-slate-100">Notificações recentes</h2><button aria-label="Fechar notificações" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button></div>
      {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
      <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!query.data?.length}>
        {query.data?.map(n => <article key={n.id} className="border-t dark:border-slate-700 py-3"><h3 className="font-medium text-sm dark:text-slate-200">{n.title}</h3><p className="text-xs text-gray-500 mt-1">{n.message}</p><time className="block text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('pt-BR')}</time>{!n.read && <button className="text-xs text-brand-600 mt-2 underline" onClick={() => markRead(n.id)}>Marcar como lida</button>}</article>)}
      </AdminDataState>
    </section>}
  </div>
}
