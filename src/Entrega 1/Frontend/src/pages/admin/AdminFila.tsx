import { Link } from 'react-router-dom'
import { Ticket as TicketIcon, Clock, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import { ticketStatusLabels, ticketPriorityLabels } from '@/lib/admin-utils'
import { cn, formatDateTime, formatRelative, getInitials } from '@/lib/utils'

export default function AdminFila() {
  const query = useAdminQuery(async () => {
    const [tickets, users] = await Promise.all([api.metrics.queue(), api.admin.getUsers()])
    return { tickets, users }
  })
  const tickets = query.data?.tickets || []
  const members = new Map<string, { id: string; name: string; status?: string; role?: string }>()
  for (const user of query.data?.users || []) {
    if (user.role === 'asa' || tickets.some(ticket => ticket.assignedTo === user.id)) members.set(user.id, user)
  }
  // Keep existing assignments visible even if an account is inactive or not listed.
  for (const ticket of tickets) {
    if (ticket.assignedTo && !members.has(ticket.assignedTo)) members.set(ticket.assignedTo, { id: ticket.assignedTo, name: ticket.attendant?.name || 'Responsável indisponível' })
  }
  const columns = [
    { id: '', name: 'Não atribuídos', status: undefined, role: undefined },
    ...Array.from(members.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  ]

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Fila de Atendimento</h1><p className="text-sm text-gray-500 dark:text-slate-400">Chamados abertos, em atendimento e aguardando aluno, distribuídos por responsável.</p></div><button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><RefreshCw className="h-4 w-4" />Atualizar</button></div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      {query.data && <>
        {!tickets.length && <p className="rounded-xl border border-gray-100 bg-white p-5 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">Nenhum chamado aguardando atendimento.</p>}
        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map(member => {
            const memberTickets = tickets.filter(ticket => (ticket.assignedTo || '') === member.id)
            return <section key={member.id} className="flex max-h-[calc(100vh-220px)] min-h-64 w-80 shrink-0 flex-col rounded-xl border border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-slate-800"><div className="flex min-w-0 items-center gap-2">
                {member.id ? <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{getInitials(member.name)}</div> : <TicketIcon className="h-4 w-4 shrink-0 text-gray-500" />}
                <div className="min-w-0"><h3 className="truncate font-semibold text-gray-900 dark:text-slate-100" title={member.name}>{member.name}</h3>{member.status === 'inativo' && <p className="text-xs text-gray-500 dark:text-slate-400">Conta inativa</p>}{member.role === 'admin' && <p className="text-xs text-gray-500 dark:text-slate-400">Administrador</p>}</div>
              </div><span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">{memberTickets.length}</span></div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {!memberTickets.length && <p className="p-3 text-center text-xs text-gray-500 dark:text-slate-400">Nenhum chamado nesta fila.</p>}
                {memberTickets.map(ticket => <Link key={ticket.id} to={`/admin/chamados?ticket=${encodeURIComponent(ticket.id)}`} className="block rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-2 flex items-start justify-between gap-2"><span className="font-mono text-xs text-gray-500">#{ticket.number}</span><span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium uppercase', ticket.priority === 'critica' || ticket.priority === 'alta' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300')}>{ticketPriorityLabels[ticket.priority] || ticket.priority}</span></div>
                  <p className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-slate-100">{ticket.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{ticket.student?.name || 'Aluno não identificado'}{ticket.student?.ra ? ` · ${ticket.student.ra}` : ''}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{ticketStatusLabels[ticket.status] || ticket.status}</p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400" title={formatDateTime(ticket.createdAt)}><Clock className="h-3 w-3" />Criado {formatRelative(ticket.createdAt).toLowerCase()}</p>
                  <p className={cn('mt-1 text-xs', ticket.isSlaBreached ? 'text-red-600 dark:text-red-400' : ticket.isSlaRisk ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-slate-400')}>{ticket.isSlaBreached ? 'SLA vencido' : ticket.isSlaRisk ? 'SLA em risco' : 'Prazo SLA'}: {formatDateTime(ticket.slaDeadline) || 'Não informado'}</p>
                </Link>)}
              </div>
            </section>
          })}
        </div>
      </>}
    </AdminDataState>
  </div>
}
