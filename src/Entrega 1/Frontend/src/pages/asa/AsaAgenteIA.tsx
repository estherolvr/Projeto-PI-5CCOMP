import { Activity, ArrowRight, Bot, BrainCircuit, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react'
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
        <article className="ai-health-card"><span className="ai-card-icon"><Bot/></span><div><small>GOOGLE GEMINI</small><h2>{gemini?.status ?? 'Sem diagnóstico'}</h2><p>{gemini?.detail ?? 'Não há diagnóstico disponível.'}</p></div><span className={healthy ? 'ai-health-state healthy' : 'ai-health-state'}><Activity size={14}/>{healthy ? 'Operacional' : 'Verificar'}</span></article>
        <article className="ai-total-card"><span><Sparkles/></span><div><small>RECOMENDAÇÕES REGISTRADAS</small><strong>{suggestions.length}</strong><p>Sugestões vinculadas aos chamados</p></div></article>
      </section>
      <section className="ai-recommendations"><header><div><div className="section-kicker">APOIO À EQUIPE</div><h2>Recomendações recentes</h2><p>Estimativas de apoio sujeitas à revisão da equipe ASA.</p></div><CheckCircle2 size={20}/></header>
        <DataState loading={false} error={null} onRetry={query.refresh} empty={!suggestions.length}><div className="ai-recommendation-list">{suggestions.map(ticket => <Link to={'/asa/chamados/' + ticket.id} key={ticket.id}><span><BrainCircuit size={17}/></span><div><small>CHAMADO #{ticket.number}</small><h3>{ticket.title}</h3><p>{ticket.aiSuggestion?.recommendation}</p></div><ArrowRight size={17}/></Link>)}</div></DataState>
      </section>
    </DataState>
  </div>
}
