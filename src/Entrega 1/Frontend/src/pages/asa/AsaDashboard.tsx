import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Clock3, Headphones, Inbox, ListFilter, RefreshCw, Search, ShieldAlert, TicketCheck, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'
import StatusBadge from '@/components/ui/StatusBadge'
import PriorityBadge from '@/components/ui/PriorityBadge'
import SLAIndicator from '@/components/ui/SLAIndicator'
import type { Ticket } from '@/lib/types'

const statusLabels: Record<string, string> = { aberto: 'Abertos', em_atendimento: 'Em atendimento', aguardando_aluno: 'Aguardando aluno', resolvido: 'Resolvidos', fechado: 'Fechados' }
const categoryLabels: Record<string, string> = { matricula: 'Matrícula', financeiro: 'Financeiro', academico: 'Acadêmico', documentos: 'Documentos', infraestrutura: 'Infraestrutura', cancelamento: 'Cancelamento', outros: 'Outros' }

function MetricCard({ icon: Icon, label, value, description, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; description: string; tone: string }) {
  return <article className="asa-metric-card bg-white dark:bg-slate-800 border dark:border-slate-700"><div className={`asa-metric-icon ${tone}`}><Icon className="h-5 w-5" /></div><div><p>{label}</p><strong>{value.toLocaleString('pt-BR')}</strong><small>{description}</small></div></article>
}

export default function AsaDashboard() {
  const user = useAppStore(s => s.currentUser)
  const query = useApiQuery(() => api.tickets.list())
  const tickets = query.data ?? []
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [priority, setPriority] = useState('todas')

  const operation = useMemo(() => {
    const active = tickets.filter(ticket => !['resolvido', 'fechado'].includes(ticket.status))
    const resolved = tickets.filter(ticket => ['resolvido', 'fechado'].includes(ticket.status))
    return { active, resolved, open: tickets.filter(ticket => ticket.status === 'aberto'), inService: tickets.filter(ticket => ticket.status === 'em_atendimento'), waiting: tickets.filter(ticket => ticket.status === 'aguardando_aluno'), mine: active.filter(ticket => ticket.assignedTo === user?.id), breached: active.filter(ticket => ticket.slaStatus === 'breached'), risk: active.filter(ticket => ticket.slaStatus === 'risk'), urgent: active.filter(ticket => ['alta', 'critica'].includes(ticket.priority)), rate: tickets.length ? Math.round((resolved.length / tickets.length) * 100) : 0 }
  }, [tickets, user?.id])

  const visibleTickets = useMemo(() => tickets.filter(ticket => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    const matchesSearch = !term || `${ticket.number} ${ticket.title} ${categoryLabels[ticket.category] ?? ticket.category}`.toLocaleLowerCase('pt-BR').includes(term)
    return matchesSearch && (status === 'todos' || ticket.status === status) && (priority === 'todas' || ticket.priority === priority)
  }).slice(0, 10), [tickets, search, status, priority])

  const statusDistribution = [['Abertos', operation.open.length, 'bg-sky-500'], ['Em atendimento', operation.inService.length, 'bg-violet-500'], ['Aguardando aluno', operation.waiting.length, 'bg-amber-500'], ['Resolvidos', operation.resolved.length, 'bg-emerald-500']] as const
  const metrics = [
    { icon: Inbox, label: 'Chamados abertos', value: operation.open.length, description: 'Aguardando início do atendimento', tone: 'tone-blue' },
    { icon: CircleDot, label: 'Em atendimento', value: operation.inService.length, description: 'Em acompanhamento pela equipe', tone: 'tone-violet' },
    { icon: Clock3, label: 'Aguardando aluno', value: operation.waiting.length, description: 'Dependem de retorno do estudante', tone: 'tone-amber' },
    { icon: UserCheck, label: 'Atribuídos a mim', value: operation.mine.length, description: 'Sua carteira ativa', tone: 'tone-green' },
  ]
  const attention = [...operation.breached, ...operation.risk, ...operation.urgent.filter(ticket => ticket.slaStatus === 'ok')].filter((ticket, index, list) => list.findIndex(item => item.id === ticket.id) === index).slice(0, 5)

  return <div className="asa-command-center p-4 md:p-8 space-y-6 max-w-[1480px] mx-auto">
    <header className="asa-dashboard-header asa-standard-header"><div><div className="workspace-eyebrow"><Headphones size={15} /> ÁREA DO SUCESSO ALVARISTA</div><h1>Olá, {user?.name?.split(' ')[0] || 'Atendente'}</h1><p>Visão operacional dos atendimentos registrados no sistema.</p></div><div className="asa-header-actions"><span>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}</span><button onClick={() => void query.refresh()}><RefreshCw size={15} /> Atualizar dados</button></div></header>
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <section aria-label="Indicadores principais" className="asa-metric-grid">{metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}</section>
      <div className="asa-insight-grid">
        <section className="asa-panel asa-operation-panel"><div className="asa-panel-heading"><div><span className="section-kicker">INTELIGÊNCIA OPERACIONAL</span><h2>Distribuição dos chamados</h2></div><Link to="/asa/metricas">Ver métricas <ArrowRight size={14} /></Link></div><div className="asa-distribution"><div className="asa-resolution-score"><strong>{operation.rate}%</strong><span>taxa de resolução</span><small>{operation.resolved.length} de {tickets.length} chamados concluídos</small></div><div className="asa-status-bars">{statusDistribution.map(([label, value, color]) => { const percentage = tickets.length ? Math.max((value / tickets.length) * 100, value ? 4 : 0) : 0; return <div key={label}><div><span>{label}</span><strong>{value}</strong></div><div className="asa-bar"><span className={color} style={{ width: `${percentage}%` }} /></div></div> })}</div></div></section>
        <section className="asa-panel asa-attention-panel"><div className="asa-panel-heading"><div><span className="section-kicker">ATENÇÃO NECESSÁRIA</span><h2>Prioridades da operação</h2></div><ShieldAlert size={20} /></div>{!attention.length ? <div className="asa-all-clear"><CheckCircle2 size={28} /><div><strong>Nenhum alerta crítico</strong><p>Não há chamados ativos em risco ou com SLA vencido.</p></div></div> : <div className="asa-alert-list">{attention.map(ticket => <Link key={ticket.id} to={`/asa/chamados/${ticket.id}`}><span className={ticket.slaStatus === 'breached' ? 'alert-red' : ticket.slaStatus === 'risk' ? 'alert-amber' : 'alert-blue'}><AlertTriangle size={16} /></span><div><strong>#{ticket.number} · {ticket.title}</strong><small>{ticket.slaStatus === 'breached' ? 'SLA vencido' : ticket.slaStatus === 'risk' ? 'SLA próximo do vencimento' : `Prioridade ${ticket.priority}`}</small></div><ArrowRight size={15} /></Link>)}</div>}</section>
      </div>
      <section className="asa-panel asa-ticket-panel"><div className="asa-panel-heading asa-ticket-heading"><div><span className="section-kicker">ACOMPANHAMENTO</span><h2>Chamados recentes</h2><p>Consulte e priorize os registros da operação.</p></div><Link to="/asa/chamados">Visualizar todos <ArrowRight size={14} /></Link></div><div className="asa-ticket-tools"><label><Search size={17} /><input aria-label="Pesquisar chamados recentes" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar número, assunto ou categoria" /></label><div><ListFilter size={16} /><select aria-label="Filtrar chamados por status" value={status} onChange={event => setStatus(event.target.value)}><option value="todos">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filtrar chamados por prioridade" value={priority} onChange={event => setPriority(event.target.value)}><option value="todas">Todas as prioridades</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></div></div>
        <DataState loading={false} error={null} onRetry={query.refresh} empty={!visibleTickets.length}><div className="asa-ticket-table-wrap"><table className="asa-ticket-table"><thead><tr><th>Chamado</th><th>Categoria</th><th>Prioridade</th><th>Status</th><th>Atualização</th><th>SLA</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{visibleTickets.map((ticket: Ticket) => <tr key={ticket.id} className={ticket.slaStatus === 'breached' || ticket.priority === 'critica' ? 'needs-attention' : ''}><td><Link to={`/asa/chamados/${ticket.id}`}><strong>#{ticket.number}</strong><span>{ticket.title}</span></Link></td><td>{categoryLabels[ticket.category] ?? ticket.category}</td><td><PriorityBadge priority={ticket.priority} /></td><td><StatusBadge status={ticket.status} /></td><td><time dateTime={ticket.updatedAt}>{new Date(ticket.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</time></td><td><SLAIndicator deadline={ticket.slaDeadline} status={ticket.slaStatus} /></td><td><Link aria-label={`Abrir chamado ${ticket.number}`} to={`/asa/chamados/${ticket.id}`}><ArrowRight size={17} /></Link></td></tr>)}</tbody></table></div></DataState>
      </section>
      <nav aria-label="Acessos rápidos" className="asa-quick-access"><Link to="/asa/chamados"><TicketCheck /><span><strong>Chamados</strong><small>{operation.active.length} em andamento</small></span><ArrowRight /></Link><Link to="/asa/agendamentos"><Clock3 /><span><strong>Agendamentos</strong><small>Consultar agenda ASA</small></span><ArrowRight /></Link><Link to="/asa/conversas"><Headphones /><span><strong>Conversas</strong><small>Histórico do assistente</small></span><ArrowRight /></Link></nav>
    </DataState>
  </div>
}
