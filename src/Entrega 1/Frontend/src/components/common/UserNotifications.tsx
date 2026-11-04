import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { api, type UserNotification } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from './DataState'

const READ_EVENT = 'alvaro-notification-read'

export function useNotifications() {
  const query = useApiQuery(api.notifications.list)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => {
    const refresh = () => { void query.refresh() }
    window.addEventListener(READ_EVENT, refresh)
    return () => window.removeEventListener(READ_EVENT, refresh)
  }, [query.refresh])
  async function read(notification: UserNotification) {
    if (notification.read) return true
    setBusy(notification.id)
    setActionError(null)
    try {
      await api.notifications.read(notification.id)
      window.dispatchEvent(new Event(READ_EVENT))
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar a notificação.')
      return false
    } finally { setBusy(null) }
  }
  return { ...query, actionError, busy, read, unread: query.data?.filter(item => !item.read).length || 0 }
}

export function NotificationItems({ items, busy, onRead, onOpen }: {
  items: UserNotification[]
  busy: string | null
  onRead: (notification: UserNotification) => Promise<unknown>
  onOpen: (notification: UserNotification) => Promise<unknown>
}) {
  return <>{items.map(item => <article key={item.id} className="border-t dark:border-slate-700 py-3">
    <div className="flex items-start gap-2">
      {!item.read && <span aria-label="Não lida" className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-brand-600" />}
      <h3 className="font-medium text-sm dark:text-slate-200">{item.title}</h3>
      {item.priority === 'high' && <span className="text-xs text-red-600 ml-auto">Atenção</span>}
    </div>
    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 break-words">{item.message}</p>
    <time className="block text-xs text-gray-400 mt-1" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('pt-BR')}</time>
    <div className="flex flex-wrap gap-4 mt-2 text-xs">
      <button type="button" disabled={busy !== null} onClick={() => void onOpen(item)} className="text-brand-600 underline disabled:opacity-50">Abrir solicitação</button>
      {!item.read ? <button type="button" disabled={busy !== null} onClick={() => void onRead(item)} className="text-brand-600 underline disabled:opacity-50">{busy === item.id ? 'Salvando…' : 'Marcar como lida'}</button> : <span className="text-gray-400">Lida</span>}
    </div>
  </article>)}</>
}

export default function UserNotifications() {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const query = useNotifications()
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const closeOutside = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('mousedown', closeOutside) }
  }, [open])
  async function openNotification(notification: UserNotification) {
    if (await query.read(notification)) { setOpen(false); navigate(notification.link) }
  }
  return <div className="relative" ref={wrapper}>
    <button type="button" aria-label="Notificações" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) void query.refresh() }} className="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">
      <Bell className="w-5 h-5" />
      {query.unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] px-1">{query.unread}</span>}
    </button>
    {open && <section role="dialog" aria-label="Notificações recentes" className="fixed right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-auto bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl p-4">
      <div className="flex justify-between mb-3"><h2 className="font-semibold dark:text-slate-100">Notificações recentes</h2><button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button></div>
      {query.actionError && <p role="alert" className="text-sm text-red-600">{query.actionError}</p>}
      <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
        {!query.data?.length ? <p className="text-sm text-gray-500 py-4">Nenhuma notificação por enquanto.</p> : <NotificationItems items={query.data} busy={query.busy} onRead={query.read} onOpen={openNotification} />}
      </DataState>
    </section>}
  </div>
}
