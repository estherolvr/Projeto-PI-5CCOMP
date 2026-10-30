import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, RefreshCw, X, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import { ticketCategoryLabels, ticketPriorityLabels } from '@/lib/admin-utils'

const fieldClass = 'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

function NewSLARule({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name') || '').trim()
    const firstResponseMinutes = Number(values.get('firstResponseMinutes'))
    const resolutionHours = Number(values.get('resolutionHours'))
    if (!name || firstResponseMinutes <= 0 || resolutionHours <= 0 || firstResponseMinutes > resolutionHours * 60) {
      setError('Informe um nome e prazos positivos; a primeira resposta deve ocorrer até o prazo de resolução.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.admin.createSLARule({ name, priority: String(values.get('priority')), category: String(values.get('category') || '') || null, firstResponseMinutes, resolutionHours, active: true })
      await onCreated()
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível criar a regra.') }
    finally { setSaving(false) }
  }
  return <Dialog.Root open onOpenChange={open => { if (!open && !saving) onClose() }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800"><Dialog.Title className="text-lg font-bold text-gray-900 dark:text-slate-100">Nova regra de SLA</Dialog.Title><Dialog.Description className="mt-2 pr-5 text-sm text-gray-500 dark:text-slate-400">O prazo de resolução será aplicado aos novos chamados compatíveis. Chamados existentes mantêm seu prazo.</Dialog.Description><Dialog.Close disabled={saving} aria-label="Fechar formulário" className="absolute right-4 top-4 p-1 text-gray-500 dark:text-slate-300"><X className="h-5 w-5" /></Dialog.Close><form onSubmit={create} className="mt-6 space-y-4 text-sm text-gray-700 dark:text-slate-200">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    <label className="block">Nome<input name="name" required maxLength={150} className={fieldClass} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label>Prioridade<select name="priority" className={fieldClass} defaultValue="media">{Object.entries(ticketPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Categoria<select name="category" className={fieldClass}><option value="">Todas as categorias</option>{Object.entries(ticketCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label>Primeira resposta (min)<input name="firstResponseMinutes" type="number" min={1} step={1} required className={fieldClass} /></label><label>Resolução (horas)<input name="resolutionHours" type="number" min={1} step={1} required className={fieldClass} /></label></div>
    <p className="text-xs text-gray-500 dark:text-slate-400">A regra mais recente para a categoria tem precedência sobre a regra geral da mesma prioridade.</p>
    <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50">{saving ? 'Salvando…' : 'Criar regra'}</button>
  </form></Dialog.Content></Dialog.Portal></Dialog.Root>
}

export default function AdminSLA() {
  const [creating, setCreating] = useState(false)
  const query = useAdminQuery(async () => {
    const [rules, queue] = await Promise.all([api.admin.getSLARules(), api.metrics.queue()])
    return { rules, queue }
  })
  const queue = query.data?.queue || []
  const known = queue.filter(ticket => Number.isFinite(new Date(ticket.slaDeadline).getTime()))
  const breached = known.filter(ticket => ticket.isSlaBreached).length
  const risk = known.filter(ticket => ticket.isSlaRisk && !ticket.isSlaBreached).length
  const cards = [{ label: 'No prazo', value: known.length - breached - risk, icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' }, { label: 'Em risco (menos de 1h)', value: risk, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' }, { label: 'Vencidos', value: breached, icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' }]

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Acordos de Nível de Serviço (SLA)</h1><p className="text-sm text-gray-500 dark:text-slate-400">Prazos reais dos chamados ativos e regras cadastradas para novos chamados.</p></div><div className="flex gap-2"><button aria-label="Atualizar SLA" onClick={() => void query.refresh()} className="rounded-lg border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300"><RefreshCw className="h-4 w-4" /></button><button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"><Plus className="h-4 w-4" />Nova regra</button></div></div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      {query.data && <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{cards.map(card => <div key={card.label} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.color}`}><card.icon className="h-6 w-6" /></div><div><p className="text-sm text-gray-500 dark:text-slate-400">{card.label}</p><p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{card.value.toLocaleString('pt-BR')}</p></div></div>)}</div>
        <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">{queue.length} chamados ativos. {queue.length - known.length} sem prazo informado. Atualização automática a cada 30 segundos.</p>
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="border-b border-gray-100 p-4 dark:border-slate-700"><h2 className="font-semibold text-gray-900 dark:text-slate-100">Regras cadastradas</h2></div>{query.data.rules.length ? <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="bg-gray-50 text-gray-500 dark:bg-slate-900/50 dark:text-slate-400"><tr>{['Nome', 'Prioridade', 'Categoria', '1ª resposta', 'Resolução', 'Status'].map(label => <th key={label} className="px-6 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-slate-700 dark:text-slate-200">{query.data.rules.map(rule => <tr key={rule.id}><td className="px-6 py-4 font-medium">{rule.name}</td><td className="px-6 py-4">{ticketPriorityLabels[rule.priority] || rule.priority}</td><td className="px-6 py-4">{!rule.category || rule.category === 'todas' ? 'Todas' : ticketCategoryLabels[rule.category] || rule.category}</td><td className="px-6 py-4">{rule.firstResponseMinutes} min</td><td className="px-6 py-4">{rule.resolutionHours}h</td><td className="px-6 py-4">{rule.active ? 'Ativa' : 'Inativa'}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-gray-500 dark:text-slate-400">Nenhuma regra cadastrada. Novos chamados usam o prazo padrão da prioridade.</p>}</div>
      </>}
    </AdminDataState>
    {creating && <NewSLARule onClose={() => setCreating(false)} onCreated={query.refresh} />}
  </div>
}
