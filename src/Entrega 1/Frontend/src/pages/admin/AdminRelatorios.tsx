import { useState } from 'react'
import { Download, FileBarChart, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import { exportCsv, ticketCategoryLabels } from '@/lib/admin-utils'

type Report = { id: string; name: string; description: string; headers: string[]; rows: unknown[][] }

export default function AdminRelatorios() {
  const [days, setDays] = useState(30)
  const [selected, setSelected] = useState('geral')
  const query = useAdminQuery(() => api.metrics.overview(days), [days])
  const summary = query.data?.summary
  const samples = query.data?.sampleCounts
  const reports: Report[] = summary ? [
    { id: 'geral', name: 'Resumo de chamados', description: 'Status atual e categorias dos chamados criados no período.', headers: ['Grupo', 'Indicador', 'Quantidade'], rows: [
      ['Resumo', 'Criados no período', summary.totalTickets], ['Status', 'Abertos', summary.openTickets], ['Status', 'Em atendimento', summary.inProgressTickets], ['Status', 'Aguardando aluno', summary.waitingTickets], ['Status', 'Resolvidos', summary.resolvedTickets], ['Status', 'Fechados', summary.closedTickets],
      ...(query.data.categoryDistribution || []).map((item: any) => ['Categoria', ticketCategoryLabels[item.name] || item.name, item.value]),
    ] },
    { id: 'sla', name: 'Prazos e SLA', description: 'Conformidade e amostras medidas dos chamados criados no período.', headers: ['Indicador', 'Valor', 'Unidade'], rows: [
      ['Conformidade de SLA', summary.slaAdherence, '%'], ['Ativos em risco', summary.activeSlaRiskTickets, 'chamados'], ['Ativos vencidos', summary.activeSlaBreachedTickets, 'chamados'], ['SLA medido', samples?.slaMeasured, 'chamados'], ['Sem medição', samples?.slaUnknown, 'chamados'], ['Primeira resposta humana', summary.avgResponseMinutes, 'minutos'], ['Amostra de respostas', samples?.responseTimes, 'chamados'], ['Tempo de resolução', summary.avgResolutionHours, 'horas'], ['Amostra de resoluções', samples?.resolutionTimes, 'chamados'],
    ] },
    { id: 'equipe', name: 'Carga atual da equipe', description: 'Quantidade atual de chamados ativos por responsável, em todos os períodos.', headers: ['Responsável', 'E-mail', 'Chamados ativos'], rows: (query.data.attendantsWorkload || []).map((person: any) => [person.name, person.email, person.activeTickets]) },
    { id: 'avaliacoes', name: 'Avaliações da IA', description: 'Notas enviadas pelos alunos sobre as respostas da IA no período.', headers: ['Indicador', 'Valor'], rows: [['Nota média (1 a 5)', summary.csat], ['Avaliações com nota', samples?.feedbackRatings]] },
  ] : []
  const current = reports.find(report => report.id === selected)
  const download = (report: Report) => {
    const generatedAt = new Date().toISOString()
    const scope = report.id === 'equipe' ? 'Carga atual; todos os períodos' : `${days} dia(s); horário de São Paulo`
    exportCsv(`relatorio-${report.id}-${generatedAt.slice(0, 10)}.csv`, ['Gerado em', 'Escopo', ...report.headers], report.rows.map(row => [generatedAt, scope, ...row]))
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Relatórios</h1><p className="text-sm text-gray-500 dark:text-slate-400">Visualize e exporte os indicadores registrados no sistema.</p></div><div className="flex gap-2"><select aria-label="Período dos relatórios" value={days} onChange={event => setDays(Number(event.target.value))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{[1, 7, 30, 90].map(value => <option value={value} key={value}>{value === 1 ? 'Hoje' : `Últimos ${value} dias`}</option>)}</select><button aria-label="Atualizar relatórios" onClick={() => void query.refresh()} className="rounded-lg border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300"><RefreshCw className="h-4 w-4" /></button></div></div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{reports.map(report => <article key={report.id} className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mb-4 flex items-start gap-4"><div className="rounded-xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"><FileBarChart className="h-6 w-6" /></div><div><h2 className="font-bold text-gray-900 dark:text-slate-100">{report.name}</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{report.description}</p></div></div><div className="mt-auto flex gap-2 border-t border-gray-100 pt-4 dark:border-slate-700"><button onClick={() => setSelected(report.id)} aria-pressed={selected === report.id} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">Visualizar</button><button onClick={() => download(report)} disabled={!report.rows.length} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200"><Download className="h-4 w-4" />Exportar CSV</button></div></article>)}</div>
      {current && <section className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800"><div className="border-b border-gray-100 p-5 dark:border-slate-700"><h2 className="font-semibold text-gray-900 dark:text-slate-100">{current.name}</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{current.description} Valores sem medição aparecem como “Sem dados” e ficam vazios no CSV.</p></div>{current.rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 dark:bg-slate-900/50 dark:text-slate-400"><tr>{current.headers.map(header => <th key={header} className="px-6 py-3 font-medium">{header}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-slate-700 dark:text-slate-200">{current.rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column} className="px-6 py-3">{value == null ? 'Sem dados' : typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(value)}</td>)}</tr>)}</tbody></table></div> : <p className="p-8 text-center text-gray-500 dark:text-slate-400">Nenhum registro para este relatório.</p>}</section>}
    </AdminDataState>
  </div>
}
