import { Activity, ArrowRight, Bot, BrainCircuit, CheckCircle2, RefreshCw, ShieldCheck, Sparkles, TicketCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'

export default function AsaAgenteIA() {
  const query = useApiQuery(async () => { const [tickets, health] = await Promise.all([api.tickets.list(), api.admin.getHealth()]); return { tickets, health } })
  const suggestions = (query.data?.tickets ?? []).filter(ticket => ticket.aiSuggestion)
  const gemini = query.data?.health.checks.find(check => check.id === 'gemini')
  const healthy = ['ok', 'healthy', 'operational', 'disponível'].includes(String(gemini?.status ?? '').toLowerCase())
  return <div className="asa-standard-page ai-workspace space-y-6">
    <header className="asa-standard-header"><div><div className="section-kicker"><BrainCircuit size={15}/> INTELIGÊNCIA OPERACIONAL</div><h1>Assistência de IA</h1><p>Diagnóstico da integração e recomendações registradas nos chamados.</p></div><button aria-label="Atualizar assistência de IA" onClick={() => void query.refresh()} className="asa-standard-action"><RefreshCw size={17}/> Atualizar</button></header>
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <section className="ai-overview">
        <article className="ai-health-card"><div className="ai-health-main"><span className="ai-card-icon"><Bot/></span><div><small>GOOGLE GEMINI</small><h2>Integração do assistente</h2><p>{gemini?.detail ?? 'Não há diagnóstico disponível.'}</p></div></div><div className="ai-health-footer"><span className={healthy ? 'ai-health-state healthy' : 'ai-health-state'}><Activity size={14}/>{healthy ? 'Operacional' : 'Requer verificação'}</span><span className="ai-provider-label"><ShieldCheck size={14}/> Serviço monitorado</span></div></article>
        <article className="ai-total-card"><div className="ai-total-top"><span><Sparkles/></span><small>RECOMENDAÇÕES REGISTRADAS</small></div><strong>{suggestions.length}</strong><p>Sugestões de apoio disponíveis para revisão da equipe.</p><span className="ai-total-foot"><TicketCheck size={14}/>{suggestions.length === 1 ? '1 chamado assistido' : `${suggestions.length} chamados assistidos`}</span></article>
      </section>
      <section className="ai-recommendations"><header><div><div className="section-kicker">APOIO À EQUIPE</div><h2>Recomendações para revisão</h2><p>Conteúdo gerado pelo assistente que aguarda a avaliação da equipe ASA.</p></div><span className="ai-review-badge"><CheckCircle2 size={15}/>{suggestions.length} disponíveis</span></header>
        <DataState loading={false} error={null} onRetry={query.refresh} empty={!suggestions.length}><div className="ai-recommendation-list">{suggestions.map(ticket => <Link to={'/asa/chamados/' + ticket.id} key={ticket.id}><span className="ai-recommendation-icon"><BrainCircuit size={18}/></span><div><div className="ai-recommendation-meta"><small>CHAMADO #{ticket.number}</small><span>REVISÃO HUMANA</span></div><h3>{ticket.title}</h3><p>{ticket.aiSuggestion?.recommendation}</p></div><span className="ai-recommendation-action">Revisar <ArrowRight size={15}/></span></Link>)}</div></DataState>
      </section>
    </DataState>
  </div>
}
