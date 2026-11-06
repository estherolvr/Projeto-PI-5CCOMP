import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, BellRing, CheckCheck } from 'lucide-react'
import type { UserNotification } from '@/lib/api'
import { DataState } from '@/components/common/DataState'
import { NotificationItems, useNotifications } from '@/components/common/UserNotifications'

export default function AsaNotificacoes() {
  const query = useNotifications()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const visible = (query.data || []).filter(notification => filter === 'all' || !notification.read)
  async function open(notification: UserNotification) {
    if (await query.read(notification)) navigate(notification.link)
  }
  return <div className="notification-workspace asa-standard-page space-y-6">
    <header className="asa-standard-header">
      <div><div className="section-kicker"><BellRing size={16}/> CENTRAL DE ATUALIZAÇÕES</div><h1>Notificações</h1><p>Chamados, respostas, agendamentos e prazos. Até 100 notificações recentes.</p></div>
      <button type="button" onClick={() => void query.refresh()} className="asa-standard-action"><RefreshCw className="w-4 h-4" />Atualizar</button>
    </header>
    <div className="notification-tabs flex gap-3 text-sm">
      <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} className={filter === 'all' ? 'font-semibold text-brand-600 underline' : 'text-gray-500'}>Todas</button>
      <button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')} className={filter === 'unread' ? 'font-semibold text-brand-600 underline' : 'text-gray-500'}>Não lidas ({query.unread})</button>
    </div>
    <button type="button" disabled={!query.unread || query.busy !== null} onClick={() => void query.readAll()} className="notification-read-all text-sm text-brand-600 disabled:opacity-50"><CheckCheck size={16}/>{query.busy === 'all' ? 'Salvando…' : 'Marcar todas como lidas'}</button>
    {query.actionError && <p role="alert" className="text-red-600">{query.actionError}</p>}
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      {!visible.length ? <p className="p-8 text-center text-gray-500">{filter === 'unread' ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação por enquanto.'}</p> : <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><NotificationItems items={visible} busy={query.busy} onRead={query.read} onOpen={open} /></div>}
    </DataState>
  </div>
}
