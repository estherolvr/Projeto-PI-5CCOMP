import React, { useState, useEffect } from 'react'
import {
  Download, Filter, Eye, List, Search, RefreshCw, Shield, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { exportCsv } from '@/lib/admin-utils'
import { useAdminQuery } from '@/lib/use-admin-query'

interface AuditLog {
  id: string
  userId?: string
  userName: string
  userRole: string
  action: string
  resource: string
  resourceId: string
  details?: string
  severity: string
  ip: string
  createdAt: string
}

export default function AdminAuditoria() {
  const [view, setView] = useState<'table' | 'timeline'>('timeline')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('todos')

  const { data, loading, error, refresh: loadLogs } = useAdminQuery(() => api.admin.getAuditLogs({ limit: 100 }))
  useEffect(() => { if (data) setLogs(data) }, [data])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesSeverity = severityFilter === 'todos' || log.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Nenhum log para exportar.')
      return
    }

    exportCsv(`auditoria_fecap_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Data', 'Usuário', 'Perfil', 'Ação', 'Recurso', 'ID', 'Detalhes', 'Severidade'],
      filteredLogs.map(log => [log.createdAt, log.userName, log.userRole, log.action, log.resource, log.resourceId, log.details, log.severity]))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Trilha de Auditoria & Governança
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Registro cronológico e imutável de todas as ações administrativas, operacionais e de IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-brand-600')} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar em eventos de auditoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none dark:text-slate-100"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-2.5 py-2 text-gray-700 dark:text-slate-300 outline-none"
          >
            <option value="todos">Todas severidades</option>
            <option value="info">Info</option>
            <option value="warning">Aviso</option>
            <option value="critical">Crítico</option>
          </select>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => setView('timeline')}
            className={cn('p-1.5 rounded-md transition-colors', view === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-slate-100' : 'text-gray-500')}
            title="Visualização Timeline"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={cn('p-1.5 rounded-md transition-colors', view === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-slate-100' : 'text-gray-500')}
            title="Visualização Tabela"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            Carregando eventos reais de auditoria...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Nenhum evento registrado</p>
            <p className="text-xs text-gray-400 mt-1">Ações executadas no sistema serão auditadas e listadas aqui.</p>
          </div>
        ) : view === 'timeline' ? (
          <div className="relative border-l border-gray-200 dark:border-slate-700 ml-4 space-y-6 pb-2">
            {filteredLogs.map((ev) => (
              <div key={ev.id} className="relative pl-6 sm:pl-8">
                <span
                  className={cn('absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-800', {
                    'bg-blue-500': ev.severity === 'info',
                    'bg-amber-500': ev.severity === 'warning',
                    'bg-red-500': ev.severity === 'critical',
                  })}
                />
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 font-mono text-sm">
                    {ev.action}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(ev.createdAt).toLocaleString('pt-BR')} • <strong className="text-gray-700 dark:text-slate-300">{ev.userName}</strong> ({ev.userRole})
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300 font-mono bg-gray-50 dark:bg-slate-900/60 p-2 rounded-lg border border-gray-100 dark:border-slate-800 inline-block mt-1">
                  Recurso: {ev.resource} ({ev.resourceId}) {ev.details ? `· Detalhes: ${ev.details}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mt-6">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Data/Hora</th>
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Ação</th>
                  <th className="px-6 py-3 font-medium">Recurso</th>
                  <th className="px-6 py-3 font-medium">Severidade</th>
                  <th className="px-6 py-3 font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredLogs.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-3 text-gray-500 dark:text-slate-400 text-xs">
                      {new Date(ev.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-gray-900 dark:text-slate-100 font-medium">
                      {ev.userName} <span className="text-xs text-gray-400">({ev.userRole})</span>
                    </td>
                    <td className="px-6 py-3 text-gray-900 dark:text-slate-100 font-mono text-xs">
                      {ev.action}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{ev.resource}</td>
                    <td className="px-6 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', {
                        'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300': ev.severity === 'info',
                        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300': ev.severity === 'warning',
                        'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300': ev.severity === 'critical',
                      })}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 max-w-xs truncate">
                      {ev.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
