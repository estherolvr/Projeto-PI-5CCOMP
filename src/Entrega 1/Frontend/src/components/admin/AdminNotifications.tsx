import { useEffect, useRef, useState } from 'react'
import { Bell, X, CheckCheck, CircleAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from './AdminDataState'

export default function AdminNotifications() {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const query = useAdminQuery(api.admin.getNotifications)
  const [readIds,setReadIds]=useState<Set<string>>(new Set())
  const [busy,setBusy]=useState(false)
  const items=query.data?.map(n=>({...n,read:n.read||readIds.has(n.id)}))
  const unread = items?.filter(n => !n.read).length || 0
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const closeOutside = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('mousedown', closeOutside) }
  }, [open])
  const markRead = async (id?: string) => {
    const ids=id?[id]:(items||[]).filter(n=>!n.read).map(n=>n.id)
    setReadIds(previous=>new Set([...previous,...ids]));setBusy(true);setActionError(null)
    try {if(id) await api.admin.markNotificationRead(id);else await api.admin.markAllNotificationsRead()}
    catch (err) {setReadIds(previous=>new Set([...previous].filter(value=>!ids.includes(value))));setActionError(err instanceof Error ? err.message : 'Não foi possível atualizar a notificação.')}
    finally {setBusy(false)}
  }
  return <div className="relative notification-center" ref={wrapper}>
    <button aria-label="Notificações" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) void query.refresh() }} className="notification-trigger"><Bell />{unread > 0 && <span className="notification-counter">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <section aria-label="Notificações recentes" className="notification-popover">
      <header className="notification-popover-header"><div><span>Central administrativa</span><h2>Notificações</h2></div><button aria-label="Fechar notificações" onClick={() => setOpen(false)}><X /></button></header>
      <div className="notification-popover-toolbar"><span>{unread ? `${unread} ${unread === 1 ? 'não lida' : 'não lidas'}` : 'Tudo em dia'}</span><button disabled={busy||!unread} onClick={()=>void markRead()}><CheckCheck />{busy ? 'Salvando…' : 'Ler todas'}</button></div>
      {actionError && <p role="alert" className="notification-popover-error">{actionError}</p>}
      <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!query.data?.length}>
        <div className="notification-popover-list">{items?.map(n => <article key={n.id} className="notification-popover-item" data-read={n.read}><div className="notification-popover-item-heading"><span className="notification-item-icon"><CircleAlert /></span><h3>{n.title}</h3>{!n.read&&<span aria-label="Não lida" className="notification-unread-dot"/>}</div><p>{n.message}</p><time>{new Date(n.createdAt).toLocaleString('pt-BR')}</time>{!n.read&&<div className="notification-item-actions"><button disabled={busy} onClick={() => markRead(n.id)}><CheckCheck/>Marcar como lida</button></div>}</article>)}</div>
      </AdminDataState>
    </section>}
  </div>
}
