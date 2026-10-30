import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, Download, RefreshCw, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Ticket, TicketStatus, User } from '@/lib/mock-data'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import { exportCsv, ticketStatusLabels, ticketCategoryLabels, ticketPriorityLabels } from '@/lib/admin-utils'
import { formatDateTime } from '@/lib/utils'

type AdminTicket = Ticket & {
  student?: { name: string; ra: string; email: string; course?: string }
  attendant?: { id: string; name: string }
  messages?: { id: string; senderName: string; content: string; createdAt: string; isInternal: boolean }[]
}
const inputClass = 'rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100'

function TicketDetails({ id, users, onUpdated, onClose }: { id: string; users: User[]; onUpdated: () => Promise<void>; onClose: () => void }) {
  const query = useAdminQuery(() => api.tickets.get(id) as Promise<AdminTicket>, [id])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = async (changes: Partial<Ticket>) => {
    setSaving(true)
    setError(null)
    try {
      await api.tickets.update(id, changes)
      await Promise.all([query.refresh(), onUpdated()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o chamado.')
    } finally { setSaving(false) }
  }
  const ticket = query.data
  const assignable = users.filter(user => user.status === 'ativo' || user.id === ticket?.assignedTo)
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
          <Dialog.Title className="pr-8 text-xl font-bold text-gray-900 dark:text-slate-100">{ticket ? `#${ticket.number} — ${ticket.title}` : 'Detalhes do chamado'}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-slate-400">Dados e histórico compartilhados com o aluno e o ASA.</Dialog.Description>
          <Dialog.Close aria-label="Fechar detalhes" className="absolute right-4 top-4 rounded p-1 text-gray-500 dark:text-slate-300"><X className="h-5 w-5" /></Dialog.Close>
          <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
            {ticket && <div className="mt-6 space-y-6 text-sm text-gray-700 dark:text-slate-200">
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">Status<select aria-label="Status do chamado" disabled={saving} value={ticket.status} onChange={event => void update({ status: event.target.value as TicketStatus })} className={`${inputClass} block w-full`}>{Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="space-y-1">Responsável<select aria-label="Responsável pelo chamado" disabled={saving} value={ticket.assignedTo || ''} onChange={event => void update({ assignedTo: event.target.value || null })} className={`${inputClass} block w-full`}>
                  <option value="">Não atribuído</option>
                  {ticket.assignedTo && !assignable.some(user => user.id === ticket.assignedTo) && <option value={ticket.assignedTo}>{ticket.attendant?.name || 'Responsável indisponível'}</option>}
                  {assignable.map(user => <option key={user.id} value={user.id}>{user.name}{user.status !== 'ativo' ? ' (inativo)' : ''}</option>)}
                </select></label>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-slate-900">
                <p className="font-semibold">{ticket.student?.name || 'Aluno não identificado'}</p>
                <p>{ticket.student?.ra && `RA: ${ticket.student.ra} · `}{ticket.student?.email}</p>
                {ticket.student?.course && <p>{ticket.student.course}</p>}
              </div>
              <div className="grid gap-2 sm:grid-cols-2"><p>Categoria: {ticketCategoryLabels[ticket.category] || ticket.category}</p><p>Prioridade: {ticketPriorityLabels[ticket.priority] || ticket.priority}</p><p>Criado: {formatDateTime(ticket.createdAt)}</p><p>Prazo de SLA: {formatDateTime(ticket.slaDeadline) || 'Não informado'}</p></div>
              <p className="whitespace-pre-wrap break-words">{ticket.description}</p>
              <section className="space-y-3"><h3 className="font-semibold">Histórico do atendimento</h3>
                {!ticket.messages?.length && <p className="text-gray-500 dark:text-slate-400">Ainda não há mensagens neste chamado.</p>}
                {ticket.messages?.map(message => <article key={message.id} className="rounded-lg border border-gray-100 p-3 dark:border-slate-700"><div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-gray-500 dark:text-slate-400"><span>{message.senderName}{message.isInternal ? ' · Nota interna' : ''}</span><time>{formatDateTime(message.createdAt)}</time></div><p className="whitespace-pre-wrap break-words">{message.content}</p></article>)}
              </section>
            </div>}
          </AdminDataState>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function AdminChamados() {
  const query = useAdminQuery(async () => {
    const [tickets, users] = await Promise.all([api.tickets.list(), api.admin.getUsers()])
    return { tickets: tickets as AdminTicket[], users: users.filter(user => user.role === 'asa' || user.role === 'admin') as User[] }
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('ticket')
  const setSelectedId = (id: string | null) => setParams(id ? { ticket: id } : {})
  const filtered = (query.data?.tickets || []).filter(ticket => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (!status || ticket.status === status) && [ticket.title, String(ticket.number), ticket.student?.name, ticket.student?.ra].some(value => value?.toLocaleLowerCase('pt-BR').includes(term))
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const firstRow = (currentPage - 1) * pageSize
  const pageTickets = filtered.slice(firstRow, firstRow + pageSize)
  // A status change or refresh can remove the last row on the current page.
  useEffect(() => setPage(previous => Math.min(previous, totalPages)), [totalPages])
  const download = () => exportCsv('chamados.csv', ['Número', 'Título', 'Aluno', 'RA', 'Responsável', 'Status', 'Categoria', 'Prioridade', 'Criado em', 'Prazo SLA'], filtered.map(ticket => [ticket.number, ticket.title, ticket.student?.name, ticket.student?.ra, ticket.attendant?.name, ticketStatusLabels[ticket.status], ticketCategoryLabels[ticket.category], ticketPriorityLabels[ticket.priority], ticket.createdAt, ticket.slaDeadline]))

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Chamados</h1><p className="text-sm text-gray-500 dark:text-slate-400">Chamados reais dos alunos, com responsáveis e histórico de atendimento.</p></div><div className="flex gap-2"><button onClick={() => void query.refresh()} className={`${inputClass} flex items-center gap-2`}><RefreshCw className="h-4 w-4" />Atualizar</button><button disabled={!filtered.length || !!query.error} onClick={download} className={`${inputClass} flex items-center gap-2 disabled:opacity-50`}><Download className="h-4 w-4" />Exportar CSV</button></div></div>
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap gap-3 border-b border-gray-100 p-4 dark:border-slate-700"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input aria-label="Buscar chamados" placeholder="Título, número, aluno ou RA..." value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className={`${inputClass} w-full pl-9`} /></div><select aria-label="Filtrar status" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} className={inputClass}><option value="">Todos os status</option>{Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!filtered.length}>
        <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="bg-gray-50 text-gray-500 dark:bg-slate-900/50 dark:text-slate-400"><tr>{['Chamado', 'Aluno', 'Responsável', 'Status', 'Prioridade', 'Criado em'].map(label => <th key={label} className="px-6 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{pageTickets.map(ticket => <tr key={ticket.id} className="text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-900/30"><td className="px-6 py-4"><button className="max-w-[320px] truncate text-left font-medium text-brand-700 hover:underline dark:text-brand-400" onClick={() => setSelectedId(ticket.id)}>#{ticket.number} · {ticket.title}</button></td><td className="px-6 py-4">{ticket.student?.name || 'Não identificado'}<p className="text-xs text-gray-400">{ticket.student?.ra}</p></td><td className="px-6 py-4">{ticket.attendant?.name || 'Não atribuído'}</td><td className="px-6 py-4">{ticketStatusLabels[ticket.status] || ticket.status}</td><td className="px-6 py-4">{ticketPriorityLabels[ticket.priority] || ticket.priority}</td><td className="px-6 py-4">{formatDateTime(ticket.createdAt)}</td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 p-4 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
          <p aria-live="polite">Exibindo {firstRow + 1}–{Math.min(firstRow + pageSize, filtered.length)} de {filtered.length.toLocaleString('pt-BR')} chamados</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">Por página<select aria-label="Chamados por página" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }} className={inputClass}><option value={25}>25</option><option value={50}>50</option></select></label>
            <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={`${inputClass} disabled:opacity-40`}>Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className={`${inputClass} disabled:opacity-40`}>Próxima</button>
          </div>
        </div>
      </AdminDataState>
    </div>
    {selectedId && <TicketDetails id={selectedId} users={query.data?.users || []} onUpdated={query.refresh} onClose={() => setSelectedId(null)} />}
  </div>
}
