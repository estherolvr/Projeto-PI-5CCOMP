import { Download, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import { exportCsv, ticketCategoryLabels } from '@/lib/admin-utils'

export default function AdminCategorias() {
  const query = useAdminQuery(() => api.tickets.list())
  const counts = new Map<string, { total: number; active: number; completed: number }>()
  for (const ticket of query.data || []) {
    const category = ticket.category || 'outros'
    const entry = counts.get(category) || { total: 0, active: 0, completed: 0 }
    entry.total += 1
    if (ticket.status === 'resolvido' || ticket.status === 'fechado') entry.completed += 1
    else entry.active += 1
    counts.set(category, entry)
  }
  const categories = Array.from(counts.entries()).map(([id, totals]) => ({ id, name: ticketCategoryLabels[id] || id, ...totals })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))
  const download = () => exportCsv('categorias.csv', ['Categoria', 'Chamados totais', 'Ativos', 'Resolvidos / fechados'], categories.map(category => [category.name, category.total, category.active, category.completed]))

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Categorias</h1><p className="text-sm text-gray-500 dark:text-slate-400">Distribuição dos chamados reais por assunto, em todos os períodos.</p></div><div className="flex gap-2"><button aria-label="Atualizar categorias" onClick={() => void query.refresh()} className="rounded-lg border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300"><RefreshCw className="h-4 w-4" /></button><button onClick={download} disabled={!categories.length || !!query.error} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Download className="h-4 w-4" />Exportar CSV</button></div></div>
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!categories.length}>
      <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="bg-gray-50 text-gray-500 dark:bg-slate-900/50 dark:text-slate-400"><tr>{['Categoria', 'Chamados totais', 'Ativos', 'Resolvidos / fechados', 'Participação'].map(label => <th key={label} className="px-6 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{categories.map(category => <tr key={category.id} className="text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-900/30"><td className="px-6 py-4 font-medium text-gray-900 dark:text-slate-100">{category.name}</td><td className="px-6 py-4">{category.total.toLocaleString('pt-BR')}</td><td className="px-6 py-4">{category.active.toLocaleString('pt-BR')}</td><td className="px-6 py-4">{category.completed.toLocaleString('pt-BR')}</td><td className="px-6 py-4">{((category.total / (query.data?.length || 1)) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</td></tr>)}</tbody></table></div>
    </AdminDataState></div>
  </div>
}
