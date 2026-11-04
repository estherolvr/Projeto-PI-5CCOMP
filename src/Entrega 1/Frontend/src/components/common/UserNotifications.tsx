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
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    const sync = (event: Event) => {
      const {ids, value} = (event as CustomEvent<{ids:string[];value:boolean}>).detail
      setReadIds(previous => {const next=new Set(previous);for(const id of ids) value ? next.add(id) : next.delete(id);return next})
    }
    window.addEventListener(READ_EVENT, sync)
    return () => window.removeEventListener(READ_EVENT, sync)
  }, [])
  const data=query.data?.map(item=>({...item,read:item.read||readIds.has(item.id)})) || null
  async function save(ids:string[], all:boolean) {
    if (!ids.length) return true
    setBusy(all ? 'all' : ids[0]);setActionError(null)
    const notify=(value:boolean)=>window.dispatchEvent(new CustomEvent(READ_EVENT,{detail:{ids,value}}))
    notify(true)
    try {
      if(all) await api.notifications.readAll()
      else await api.notifications.read(ids[0])
      return true
    } catch(error) {
      notify(false)
      setActionError(error instanceof Error ? error.message : 'Não foi possível salvar a leitura. Tente novamente.')
      return false
    } finally {setBusy(null)}
  }
  const read=(notification:UserNotification)=>notification.read ? Promise.resolve(true) : save([notification.id],false)
  const readAll=()=>save((data||[]).filter(item=>!item.read).map(item=>item.id),true)
  return { ...query, data, actionError, busy, read, readAll, unread: data?.filter(item => !item.read).length || 0 }
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
      {!item.read ? <button type="button" disabled={busy !== null} onClick={() => void onRead(item)} className="text-brand-600 underline disabled:opacity-50">{busy === item.id ? 'Salvando…' : 'Marcar como lida'}</button> : <span className="text-gray-400">{busy === item.id || busy === 'all' ? 'Salvando…' : 'Lida'}</span>}
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
      <button type="button" disabled={!query.unread || query.busy !== null} onClick={() => void query.readAll()} className="text-xs text-brand-600 underline disabled:opacity-50 mb-2">{query.busy === 'all' ? 'Salvando…' : 'Marcar todas como lidas'}</button>
      {query.actionError && <p role="alert" className="text-sm text-red-600">{query.actionError}</p>}
      <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
        {!query.data?.length ? <p className="text-sm text-gray-500 py-4">Nenhuma notificação por enquanto.</p> : <NotificationItems items={query.data} busy={query.busy} onRead={query.read} onOpen={openNotification} />}
      </DataState>
    </section>}
  </div>
}
