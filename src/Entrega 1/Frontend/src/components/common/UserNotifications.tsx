import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, CheckCheck, ExternalLink, CircleAlert } from 'lucide-react'
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
  return <div className="notification-popover-list">{items.map(item => <article key={item.id} className="notification-popover-item" data-read={item.read}>
    <div className="notification-popover-item-heading">
      <span className="notification-item-icon">{item.priority === 'high' ? <CircleAlert /> : <Bell />}</span>
      <h3>{item.title}</h3>
      {!item.read && <span aria-label="Não lida" className="notification-unread-dot" />}
      {item.priority === 'high' && <span className="notification-priority">Atenção</span>}
    </div>
    <p>{item.message}</p>
    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('pt-BR')}</time>
    <div className="notification-item-actions">
      <button type="button" disabled={busy !== null} onClick={() => void onOpen(item)}><ExternalLink /> Abrir solicitação</button>
      {!item.read ? <button type="button" disabled={busy !== null} onClick={() => void onRead(item)}><CheckCheck /> {busy === item.id ? 'Salvando…' : 'Marcar como lida'}</button> : <span><CheckCheck /> {busy === item.id || busy === 'all' ? 'Salvando…' : 'Lida'}</span>}
    </div>
  </article>)}</div>
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
  return <div className="relative notification-center" ref={wrapper}>
    <button type="button" aria-label="Notificações" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) void query.refresh() }} className="notification-trigger">
      <Bell className="w-5 h-5" />
      {query.unread > 0 && <span className="notification-counter">{query.unread > 99 ? '99+' : query.unread}</span>}
    </button>
    {open && <section role="dialog" aria-label="Notificações recentes" className="notification-popover">
      <header className="notification-popover-header"><div><span>Central de atualizações</span><h2>Notificações</h2></div><button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}><X /></button></header>
      <div className="notification-popover-toolbar"><span>{query.unread ? `${query.unread} ${query.unread === 1 ? 'não lida' : 'não lidas'}` : 'Tudo em dia'}</span><button type="button" disabled={!query.unread || query.busy !== null} onClick={() => void query.readAll()}><CheckCheck />{query.busy === 'all' ? 'Salvando…' : 'Ler todas'}</button></div>
      {query.actionError && <p role="alert" className="notification-popover-error">{query.actionError}</p>}
      <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
        {!query.data?.length ? <div className="notification-empty"><Bell/><strong>Nenhuma atualização</strong><p>Suas novas notificações aparecerão aqui.</p></div> : <NotificationItems items={query.data} busy={query.busy} onRead={query.read} onOpen={openNotification} />}
      </DataState>
    </section>}
  </div>
}
