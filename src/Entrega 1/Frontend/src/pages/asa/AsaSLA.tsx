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
  return <div className="p-4 md:p-6 space-y-5"><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold dark:text-white">Acompanhamento de SLA</h1><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Prazos de resposta e resolução. Atualização automática a cada 30 segundos.</p></div><button aria-label="Atualizar SLA" onClick={() => void q.refresh()} className="rounded-lg border p-2 dark:border-slate-700 dark:text-slate-200"><RefreshCw size={18} /></button></div>
    <DataState loading={q.loading} error={q.error} onRetry={q.refresh}>{q.data && <>
      <SlaMonitoring tickets={q.data.tickets} role="asa" />
      <h2 className="font-semibold dark:text-white">Regras cadastradas pela administração</h2>
      {!q.data.rules.length && <p className="text-sm text-gray-500 dark:text-slate-400">Nenhuma regra cadastrada. O prazo padrão de resolução depende da prioridade; a primeira resposta não possui prazo configurado.</p>}
      {q.data.rules.map((r: any) => <article key={r.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><h3 className="font-semibold dark:text-white">{r.name}</h3><p className="text-sm text-gray-500 dark:text-slate-400">{ticketPriorityLabels[r.priority] || r.priority} · {ticketCategoryLabels[r.category] || r.category || 'Todas as categorias'} · Primeira resposta: {r.firstResponseMinutes} min · Resolução: {r.resolutionHours} h · {r.active ? 'Ativa' : 'Inativa'}</p></article>)}
    </>}</DataState>
  </div>
}
