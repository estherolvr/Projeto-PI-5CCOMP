import { Plug, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

interface Integration { id: string; name: string; description: string; type: string; status: string; updatedAt: string; detail?: string; checkedAt?: string }
const statusLabels: Record<string, string> = { configurado: 'Configurada', nao_configurado: 'Não configurada', nao_verificado: 'Não verificada', operacional: 'Operacional', degradado: 'Degradada', offline: 'Indisponível', indisponivel: 'Indisponível' }

export default function AdminIntegracoes() {
  const query = useAdminQuery<Integration[]>(() => api.admin.getIntegrations())
  const integrations = query.data ?? []
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Integrações</h1><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Conectores registrados para o atendimento dos alunos e da equipe ASA.</p></div><button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm dark:text-slate-200"><RefreshCw size={16} /> Atualizar</button></div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!integrations.length}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{integrations.map(integration => <article key={integration.id} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"><div className="mb-4 flex items-center justify-between gap-3"><Plug size={24} className="text-brand-600 dark:text-brand-400" /><span className="rounded-full bg-gray-100 dark:bg-slate-900 px-3 py-1 text-xs text-gray-600 dark:text-slate-300">{statusLabels[integration.status] ?? integration.status}</span></div><h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{integration.name}</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{integration.description}</p>{integration.detail && <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{integration.detail}</p>}<div className="mt-5 border-t border-gray-100 dark:border-slate-700 pt-4 text-xs text-gray-500 dark:text-slate-400"><p>Tipo: {integration.type}</p><p className="mt-1">Atualização do cadastro: {integration.updatedAt ? new Date(integration.updatedAt).toLocaleString('pt-BR') : 'Não disponível'}</p></div></article>)}</div>
    </AdminDataState>
    <p className="text-sm text-gray-500 dark:text-slate-400">Credenciais configuradas não comprovam a disponibilidade do serviço externo. Verificações de conexão e métricas de sincronização não estão disponíveis nesta tela.</p>
  </div>
}
