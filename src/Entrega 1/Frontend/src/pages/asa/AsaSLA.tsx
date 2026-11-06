import { RefreshCw } from 'lucide-react'
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
  return <div className="asa-standard-page space-y-6"><header className="asa-standard-header"><div><div className="section-kicker">GESTÃO DE PRAZOS</div><h1>Acompanhamento de SLA</h1><p>Prazos de resposta e resolução. Atualização automática a cada 30 segundos.</p></div><button aria-label="Atualizar SLA" onClick={() => void q.refresh()} className="asa-standard-action"><RefreshCw size={18} /> Atualizar</button></header>
    <DataState loading={q.loading} error={q.error} onRetry={q.refresh}>{q.data && <>
      <SlaMonitoring tickets={q.data.tickets} role="asa" />
      <h2 className="font-semibold dark:text-white">Regras cadastradas pela administração</h2>
      {!q.data.rules.length && <p className="text-sm text-gray-500 dark:text-slate-400">Nenhuma regra cadastrada. O prazo padrão de resolução depende da prioridade; a primeira resposta não possui prazo configurado.</p>}
      {q.data.rules.map((r: any) => <article key={r.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><h3 className="font-semibold dark:text-white">{r.name}</h3><p className="text-sm text-gray-500 dark:text-slate-400">{ticketPriorityLabels[r.priority] || r.priority} · {ticketCategoryLabels[r.category] || r.category || 'Todas as categorias'} · Primeira resposta: {r.firstResponseMinutes} min · Resolução: {r.resolutionHours} h · {r.active ? 'Ativa' : 'Inativa'}</p></article>)}
    </>}</DataState>
  </div>
}
