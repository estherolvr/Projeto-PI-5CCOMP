import { Link } from 'react-router-dom'
import { ticketPriorityLabels } from '@/lib/admin-utils'

const labels: Record<string, string> = { ok: 'No prazo', risk: 'Em risco', breached: 'Prazo excedido', met: 'Respondido no prazo', unknown: 'Sem prazo registrado' }
const colors: Record<string, string> = { ok: 'text-green-700 dark:text-green-300', met: 'text-green-700 dark:text-green-300', risk: 'text-amber-700 dark:text-amber-300', breached: 'text-red-700 dark:text-red-300', unknown: 'text-gray-500 dark:text-slate-400' }
const date = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'

export function SlaMonitoring({ tickets, role }: { tickets: any[]; role: 'asa' | 'admin' }) {
  return <section className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
    <div className="border-b border-gray-100 p-4 dark:border-slate-700"><h2 className="font-semibold text-gray-900 dark:text-slate-100">Acompanhamento dos chamados ativos</h2><p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Horários de São Paulo. Prazos em horas corridas. Notas internas não contam como primeira resposta.</p></div>
    {!tickets.length ? <p className="p-6 text-center text-gray-500 dark:text-slate-400">Nenhum chamado ativo para acompanhar.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 dark:bg-slate-900 dark:text-slate-400"><tr>{['Chamado', 'Responsável', 'Primeira resposta', 'Resolução'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{tickets.map(ticket => <tr key={ticket.id}>
      <td className="px-4 py-4">{role === 'asa' ? <Link className="font-medium text-brand-700 underline dark:text-brand-300" to={`/asa/chamados/${ticket.id}`}>#{ticket.number} · {ticket.title}</Link> : <span className="font-medium text-gray-900 dark:text-slate-100">#{ticket.number} · {ticket.title}</span>}<p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{ticketPriorityLabels[ticket.priority] || ticket.priority} · {ticket.ruleName}</p></td>
      <td className="px-4 py-4 text-gray-700 dark:text-slate-200">{ticket.attendant?.name || 'Não atribuído'}</td>
      <td className="px-4 py-4"><p className={colors[ticket.firstResponseStatus]}>{labels[ticket.firstResponseStatus]}</p><p className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">Limite: {date(ticket.firstResponseDeadline)}</p>{ticket.firstResponseAt && <p className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">Respondido: {date(ticket.firstResponseAt)}</p>}</td>
      <td className="px-4 py-4"><p className={colors[ticket.resolutionStatus]}>{labels[ticket.resolutionStatus]}</p><p className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">{date(ticket.resolutionDeadline)}</p></td>
    </tr>)}</tbody></table></div>}
    <p className="p-4 text-xs text-gray-500 dark:text-slate-400">O prazo de primeira resposta aparece quando foi registrado na abertura do chamado. Alterações nas regras valem para novos chamados; mudanças na prioridade ou categoria de um chamado ativo recalculam sua resolução a partir da abertura.</p>
  </section>
}
