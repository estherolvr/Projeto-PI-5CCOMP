import { Clock3, RefreshCw, ShieldCheck, TimerReset } from 'lucide-react'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { SlaMonitoring } from '@/components/common/SlaMonitoring'
import { ticketCategoryLabels, ticketPriorityLabels } from '@/lib/admin-utils'

export default function AsaSLA() {
  const q = useApiQuery(async () => {
    const [rules, tickets] = await Promise.all([api.admin.getSLARules(), api.admin.getSLAMonitor()])
    return { rules, tickets }
  })
  const risk = q.data?.tickets.filter((ticket: any) => ticket.resolutionStatus === 'risk').length ?? 0
  const breached = q.data?.tickets.filter((ticket: any) => ticket.resolutionStatus === 'breached').length ?? 0
  return <div className="asa-standard-page sla-workspace space-y-6">
    <header className="asa-standard-header"><div><div className="section-kicker"><Clock3 size={15}/> GESTÃO DE PRAZOS</div><h1>Acompanhamento de SLA</h1><p>Prazos de resposta e resolução. Atualização automática a cada 30 segundos.</p></div><button aria-label="Atualizar SLA" onClick={() => void q.refresh()} className="asa-standard-action"><RefreshCw size={17}/> Atualizar</button></header>
    <DataState loading={q.loading} error={q.error} onRetry={q.refresh}>{q.data && <>
      <section className="sla-summary" aria-label="Resumo de SLA">
        <article><span className="sla-summary-icon green"><ShieldCheck/></span><div><small>CHAMADOS MONITORADOS</small><strong>{q.data.tickets.length}</strong><p>Solicitações ativas com prazo</p></div></article>
        <article><span className="sla-summary-icon amber"><Clock3/></span><div><small>EM RISCO</small><strong>{risk}</strong><p>Exigem acompanhamento</p></div></article>
        <article><span className="sla-summary-icon red"><TimerReset/></span><div><small>PRAZO EXCEDIDO</small><strong>{breached}</strong><p>Precisam de ação imediata</p></div></article>
      </section>
      <SlaMonitoring tickets={q.data.tickets} role="asa" />
      <section className="sla-rules-panel"><header><div><div className="section-kicker">CONFIGURAÇÃO VIGENTE</div><h2>Regras cadastradas pela administração</h2></div><span>{q.data.rules.length} regra{q.data.rules.length === 1 ? '' : 's'}</span></header>
        {!q.data.rules.length && <p className="sla-empty">Nenhuma regra cadastrada. O prazo padrão de resolução depende da prioridade; a primeira resposta não possui prazo configurado.</p>}
        <div className="sla-rule-grid">{q.data.rules.map((rule: any) => <article key={rule.id}><div><span className={rule.active ? 'active' : 'inactive'}>{rule.active ? 'Ativa' : 'Inativa'}</span><h3>{rule.name}</h3><p>{ticketPriorityLabels[rule.priority] || rule.priority} · {ticketCategoryLabels[rule.category] || rule.category || 'Todas as categorias'}</p></div><dl><div><dt>Primeira resposta</dt><dd>{rule.firstResponseMinutes} min</dd></div><div><dt>Resolução</dt><dd>{rule.resolutionHours} h</dd></div></dl></article>)}</div>
      </section>
    </>}</DataState>
  </div>
}
