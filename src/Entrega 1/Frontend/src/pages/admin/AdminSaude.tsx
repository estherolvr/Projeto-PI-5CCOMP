import { Activity, CheckCircle, Server } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

interface HealthCheck { id: string; label: string; status: 'operacional' | 'configurado' | 'nao_configurado' | 'indisponivel'; detail: string; checkedAt: string; latencyMs: number | null }
interface Health { checkedAt: string; checks: HealthCheck[] }
const labels: Record<HealthCheck['status'], string> = { operacional: 'Verificado', configurado: 'Configurado', nao_configurado: 'Não configurado', indisponivel: 'Indisponível' }

export default function AdminSaude() {
  const query = useAdminQuery<Health>(() => api.admin.getHealth())
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Saúde do Sistema</h1><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Verificações do servidor e configuração dos serviços usados no atendimento.</p></div><button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm dark:text-slate-200"><Activity size={16} /> Verificar agora</button></div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      {query.data && <><p className="text-sm text-gray-500 dark:text-slate-400">Última verificação: {new Date(query.data.checkedAt).toLocaleString('pt-BR')} · Atualização automática a cada 30 segundos.</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{query.data.checks.map(check => <article key={check.id} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-slate-100"><Server size={18} className="text-gray-400" />{check.label}</h2><span className={'flex items-center gap-1 rounded-full px-2 py-1 text-xs ' + (check.status === 'operacional' ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300' : check.status === 'indisponivel' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-900 dark:text-slate-300')}>{check.status === 'operacional' && <CheckCircle size={12} />}{labels[check.status]}</span></div><p className="mt-4 text-sm text-gray-600 dark:text-slate-300">{check.detail}</p><div className="mt-4 border-t border-gray-100 dark:border-slate-700 pt-3"><p className="text-xs text-gray-500 dark:text-slate-400">Tempo da verificação</p><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{check.latencyMs === null ? 'Não medido' : check.latencyMs.toLocaleString('pt-BR') + ' ms'}</p></div></article>)}</div></>}
    </AdminDataState>
    <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"><h2 className="font-bold text-gray-900 dark:text-slate-100">Disponibilidade histórica</h2><p className="mt-2 text-sm text-gray-500 dark:text-slate-400">O sistema ainda não registra uptime histórico ou incidentes. Serviços marcados como configurados possuem credenciais no servidor, mas não tiveram a conexão externa testada por esta verificação.</p></div>
  </div>
}
