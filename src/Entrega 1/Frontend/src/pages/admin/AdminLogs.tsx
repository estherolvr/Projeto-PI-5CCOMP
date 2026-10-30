import { useState } from 'react'
import { Download, RefreshCw, Terminal } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

interface AuditLog { id: string; userName: string; userRole: string; action: string; resource: string; resourceId?: string; details?: string; severity: string; createdAt: string }

export default function AdminLogs() {
  const query = useAdminQuery<AuditLog[]>(() => api.admin.getAuditLogs({ limit: 500 }))
  const [severity, setSeverity] = useState('')
  const [search, setSearch] = useState('')
  const logs = query.data ?? []
  const visible = logs.filter(log => (!severity || log.severity === severity) && [log.userName, log.action, log.resource, log.details ?? ''].join(' ').toLowerCase().includes(search.toLowerCase()))

  function download() {
    const lines = visible.map(log => '[' + log.createdAt + '] [' + log.severity.toUpperCase() + '] ' + log.userName + ' (' + log.userRole + ') | ' + log.action + ' | ' + log.resource + ' ' + (log.resourceId ?? '') + ' | ' + (log.details ?? ''))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'auditoria-filtrada.log'; link.click(); URL.revokeObjectURL(url)
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100"><Terminal size={24} /> Logs de auditoria</h1><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Até 500 eventos recentes registrados no sistema. Atualização automática a cada 30 segundos.</p></div><div className="flex gap-2"><button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:text-slate-200"><RefreshCw size={16} /> Atualizar</button><button onClick={download} disabled={query.loading || !!query.error || !visible.length} className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white disabled:opacity-50"><Download size={16} /> Exportar exibidos</button></div></div>
    <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"><select aria-label="Severidade" value={severity} onChange={event => setSeverity(event.target.value)} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 text-sm dark:text-slate-200"><option value="">Todas as severidades</option>{Array.from(new Set(logs.map(log => log.severity))).sort().map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select><input aria-label="Buscar eventos" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar usuário, ação ou recurso..." className="min-w-0 flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 text-sm dark:text-slate-200" /></div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!visible.length}>
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-slate-950 font-mono text-sm"><div className="border-b border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400">{visible.length} eventos exibidos · Mais recentes primeiro</div><div className="max-h-[65vh] min-h-64 overflow-auto p-4 space-y-3">{visible.map(log => <article key={log.id} className="rounded-lg p-2 hover:bg-white/5"><div className="flex flex-wrap gap-x-3 gap-y-1"><time className="text-slate-400">{new Date(log.createdAt).toLocaleString('pt-BR')}</time><span className={log.severity === 'critical' || log.severity === 'error' ? 'text-red-400' : log.severity === 'warning' ? 'text-amber-400' : 'text-green-400'}>[{log.severity.toUpperCase()}]</span><span className="text-slate-100">{log.userName} · {log.action}</span></div><p className="mt-1 text-xs text-slate-400">{log.resource} {log.resourceId}</p>{log.details && <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{log.details}</p>}</article>)}</div></div>
    </AdminDataState>
    <p className="text-sm text-gray-500 dark:text-slate-400">Logs de infraestrutura, rastreamento de requisições e alertas do servidor não estão disponíveis. Esta tela apresenta os eventos de auditoria persistidos.</p>
  </div>
}
