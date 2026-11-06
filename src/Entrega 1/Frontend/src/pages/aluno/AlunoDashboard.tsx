import { Activity, ArrowRight, CalendarDays, FileCheck, Headphones, MessageSquare, Sparkles, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'
import StatusBadge from '@/components/ui/StatusBadge'

export default function AlunoDashboard() {
  const user = useAppStore(state => state.currentUser)
  const query = useApiQuery(async () => { const [tickets, conversations, appointments] = await Promise.all([api.tickets.list(), api.chat.getConversations(), api.appointments.my()]); return { tickets, conversations, appointments } })
  const tickets = query.data?.tickets ?? []
  const metrics = [
    { label: 'Chamados em andamento', value: tickets.filter(ticket => !['resolvido', 'fechado'].includes(ticket.status)).length, icon: Ticket, tone: 'blue' },
    { label: 'Conversas registradas', value: query.data?.conversations.length ?? 0, icon: MessageSquare, tone: 'green' },
    { label: 'Agendamentos ativos', value: (query.data?.appointments ?? []).filter(item => ['confirmado', 'agendado', 'em_atendimento'].includes(item.status)).length, icon: CalendarDays, tone: 'amber' },
  ]
  const services = [
    { label: 'Conversar com o assistente', description: 'Orientações para sua vida acadêmica', to: '/aluno/chat', icon: Sparkles },
    { label: 'Abrir chamado', description: 'Conte com a equipe ASA', to: '/aluno/chamados/novo', icon: Ticket },
    { label: 'Agendar atendimento', description: 'Encontre um horário para conversar', to: '/aluno/agendamento', icon: CalendarDays },
    { label: 'Consultar documentos', description: 'Seus arquivos em um só lugar', to: '/aluno/documentos', icon: FileCheck },
  ]
  return <div className="student-standard-page student-dashboard space-y-6">
    <header className="student-standard-header"><div><div className="section-kicker"><Activity size={15}/> PORTAL DO ALUNO</div><h1>Olá, {user?.name?.split(' ')[0] || 'Aluno'}</h1><p>Acompanhe seus atendimentos, compromissos e conversas com a equipe.</p></div><span className="student-header-badge"><Headphones size={15}/> Atendimento acadêmico</span></header>
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <section className="student-metric-grid" aria-label="Resumo dos atendimentos">{metrics.map(({ label, value, icon: Icon, tone }) => <article key={label}><span className={`student-metric-icon ${tone}`}><Icon/></span><div><p>{label}</p><strong>{value}</strong><small>Registros atuais</small></div></article>)}</section>
      <section className="student-section-heading"><div><div className="section-kicker">ACESSO RÁPIDO</div><h2>Como podemos ajudar?</h2><p>Acesse os principais serviços acadêmicos.</p></div></section>
      <nav aria-label="Serviços do aluno" className="student-service-grid">{services.map(({ label, description, to, icon: Icon }) => <Link key={to} to={to}><span><Icon/></span><div><strong>{label}</strong><small>{description}</small></div><ArrowRight/></Link>)}</nav>
      <div className="student-overview-grid">
        <section className="student-panel"><header><div><div className="section-kicker">SOLICITAÇÕES</div><h2>Chamados recentes</h2></div><Link to="/aluno/chamados">Ver todos <ArrowRight size={14}/></Link></header><DataState loading={false} error={null} onRetry={query.refresh} empty={!tickets.length}><div className="student-recent-list">{tickets.slice(0, 5).map(ticket => <Link key={ticket.id} to={'/aluno/chamados/' + ticket.id}><div><small>#{ticket.number}</small><strong>{ticket.title}</strong></div><StatusBadge status={ticket.status}/></Link>)}</div></DataState></section>
        <section className="student-panel"><header><div><div className="section-kicker">ASSISTENTE IA</div><h2>Conversas recentes</h2></div><Link to="/aluno/chat">Abrir assistente <ArrowRight size={14}/></Link></header><DataState loading={false} error={null} onRetry={query.refresh} empty={!query.data?.conversations.length}><div className="student-recent-list conversations">{query.data?.conversations.slice(0, 5).map(conversation => <Link key={conversation.id} to={'/aluno/chat/' + conversation.id}><div><strong>{conversation.title}</strong><time>{new Date(conversation.lastMessageTime).toLocaleString('pt-BR')}</time></div><ArrowRight size={15}/></Link>)}</div></DataState></section>
      </div>
    </DataState>
  </div>
}
