import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import { ticketCategoryLabels } from '@/lib/admin-utils'

function metric(value: unknown, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${suffix}` : 'Sem dados'
}
function MetricCards({ values }: { values: { label: string; value: string }[] }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{values.map(item => <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-sm text-gray-500 dark:text-slate-400">{item.label}</p><p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{item.value}</p></div>)}</div>
}

export default function AdminMetricas() {
  const [tab, setTab] = useState('chamados')
  const [days, setDays] = useState(30)
  const query = useAdminQuery(() => api.metrics.overview(days), [days])
  const summary = query.data?.summary
  const sample = query.data?.sampleCounts
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Métricas e Analytics</h1><div className="flex flex-wrap gap-2"><div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-800">{[1, 7, 30, 90].map(value => <button key={value} onClick={() => setDays(value)} aria-pressed={days === value} className={`rounded-md px-3 py-1.5 text-sm font-medium ${days === value ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>{value === 1 ? 'Hoje' : `${value} dias`}</button>)}</div><button aria-label="Atualizar métricas" onClick={() => void query.refresh()} className="rounded-lg border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300"><RefreshCw className="h-4 w-4" /></button></div></div>
    <p className="text-sm text-gray-500 dark:text-slate-400">Indicadores dos chamados criados no período selecionado (horário de São Paulo). O gráfico mostra criações e resoluções registradas em cada dia.</p>
    <div className="flex gap-4 overflow-x-auto border-b border-gray-200 dark:border-slate-700">{[{ id: 'chamados', label: 'Chamados' }, { id: 'atendimento', label: 'Atendimento' }, { id: 'sla', label: 'SLA' }, { id: 'satisfacao', label: 'Avaliações da IA' }].map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === item.id ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 dark:text-slate-400'}`}>{item.label}</button>)}</div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      {summary && <div className="space-y-6">
        {tab === 'chamados' && <>
          <MetricCards values={[{ label: 'Criados no período', value: metric(summary.totalTickets) }, { label: 'Resolvidos / fechados', value: metric(summary.resolvedTickets + summary.closedTickets) }, { label: 'Ainda ativos', value: metric(summary.openTickets + summary.inProgressTickets + summary.waitingTickets) }, { label: 'Tempo médio de resolução', value: metric(summary.avgResolutionHours, 'h') }]} />
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h3 className="mb-6 font-semibold text-gray-900 dark:text-slate-100">Volume diário de chamados</h3>
            {query.data.chartData?.some((point: any) => point.criados || point.resolvidos) ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={query.data.chartData}><defs><linearGradient id="adminCreated" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.2} /><XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#64748b" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Legend /><Area type="monotone" dataKey="criados" name="Criados" stroke="#3b82f6" fill="url(#adminCreated)" /><Area type="monotone" dataKey="resolvidos" name="Resoluções registradas" stroke="#16a34a" fill="#16a34a" fillOpacity={0.08} /></AreaChart></ResponsiveContainer></div> : <p className="py-12 text-center text-gray-500 dark:text-slate-400">Nenhuma criação ou resolução registrada no período.</p>}
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"><h3 className="mb-4 font-semibold text-gray-900 dark:text-slate-100">Chamados por categoria</h3>{query.data.categoryDistribution?.length ? <div className="space-y-3">{query.data.categoryDistribution.map((item: any) => <div key={item.name} className="flex justify-between gap-4 text-sm text-gray-600 dark:text-slate-300"><span>{ticketCategoryLabels[item.name] || item.name}</span><strong>{metric(item.value)}</strong></div>)}</div> : <p className="text-sm text-gray-500 dark:text-slate-400">Nenhum chamado no período.</p>}</div>
        </>}
        {tab === 'atendimento' && <>
          <MetricCards values={[{ label: 'Em atendimento', value: metric(summary.inProgressTickets) }, { label: 'Aguardando aluno', value: metric(summary.waitingTickets) }, { label: 'Primeira resposta humana', value: metric(summary.avgResponseMinutes, ' min') }, { label: 'Tempo de resolução', value: metric(summary.avgResolutionHours, 'h') }]} />
          <p className="text-sm text-gray-500 dark:text-slate-400">Médias calculadas a partir de {metric(sample?.responseTimes)} respostas e {metric(sample?.resolutionTimes)} resoluções com horário registrado.</p>
          <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"><h3 className="mb-4 font-semibold text-gray-900 dark:text-slate-100">Carga atual por atendente (todos os períodos)</h3><div className="space-y-3">{query.data.attendantsWorkload?.length ? query.data.attendantsWorkload.map((person: any) => <div key={person.id} className="flex justify-between gap-4 text-sm text-gray-600 dark:text-slate-300"><span>{person.name}</span><strong>{metric(person.activeTickets)} ativos</strong></div>) : <p className="text-sm text-gray-500 dark:text-slate-400">Nenhum atendente cadastrado.</p>}</div></div>
        </>}
        {tab === 'sla' && <>
          <MetricCards values={[{ label: 'Conformidade medida', value: metric(summary.slaAdherence, '%') }, { label: 'Ativos em risco', value: metric(summary.activeSlaRiskTickets) }, { label: 'Ativos vencidos', value: metric(summary.activeSlaBreachedTickets) }, { label: 'Chamados com SLA medido', value: metric(sample?.slaMeasured) }]} />
          <p className="text-sm text-gray-500 dark:text-slate-400">O prazo atual é usado nos chamados ativos; chamados concluídos exigem horário de resolução registrado. Sem medição: {metric(sample?.slaUnknown)}.</p>
        </>}
        {tab === 'satisfacao' && <>
          <MetricCards values={[{ label: 'Nota média da IA (1 a 5)', value: metric(summary.csat) }, { label: 'Avaliações com nota no período', value: metric(sample?.feedbackRatings) }]} />
          <p className="text-sm text-gray-500 dark:text-slate-400">Avaliações enviadas pelos alunos sobre as respostas da IA no período. A satisfação com o atendimento humano ainda não é coletada.</p>
        </>}
      </div>}
    </AdminDataState>
  </div>
}
