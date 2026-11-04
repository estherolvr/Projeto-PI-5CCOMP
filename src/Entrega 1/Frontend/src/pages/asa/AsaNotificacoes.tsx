import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
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
  return <div className="p-4 md:p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold dark:text-white">Notificações</h1><p className="text-sm text-gray-500 mt-1">Chamados, respostas, agendamentos e prazos. Até 100 notificações recentes.</p></div>
      <button type="button" onClick={() => void query.refresh()} className="flex items-center gap-2 text-sm text-brand-600"><RefreshCw className="w-4 h-4" />Atualizar</button>
    </div>
    <div className="flex gap-3 text-sm">
      <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} className={filter === 'all' ? 'font-semibold text-brand-600 underline' : 'text-gray-500'}>Todas</button>
      <button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')} className={filter === 'unread' ? 'font-semibold text-brand-600 underline' : 'text-gray-500'}>Não lidas ({query.unread})</button>
    </div>
    <button type="button" disabled={!query.unread || query.busy !== null} onClick={() => void query.readAll()} className="text-sm text-brand-600 underline disabled:opacity-50">{query.busy === 'all' ? 'Salvando…' : 'Marcar todas como lidas'}</button>
    {query.actionError && <p role="alert" className="text-red-600">{query.actionError}</p>}
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      {!visible.length ? <p className="p-8 text-center text-gray-500">{filter === 'unread' ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação por enquanto.'}</p> : <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><NotificationItems items={visible} busy={query.busy} onRead={query.read} onOpen={open} /></div>}
    </DataState>
  </div>
}
