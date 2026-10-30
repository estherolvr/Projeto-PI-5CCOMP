import { useState, type FormEvent } from 'react'
import { ArrowRight, Plus, RefreshCw, X, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

interface Rule {
  id: string; name: string; description: string; active: boolean; updatedAt: string
  trigger: { type?: string }; conditions: { field?: string; operator?: string; value?: string }[]
  actions: { type?: string; target?: string; value?: string }[]
}
const labels: Record<string, string> = {
  ticket_created: 'Chamado criado', ticket_updated: 'Chamado atualizado', status_changed: 'Status alterado',
  ai_analyze: 'Analisar chamado com IA', notify_attendant: 'Notificar equipe ASA', status: 'Status',
  equals: 'igual a', aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido', fechado: 'Fechado',
}
const label = (value?: string) => value ? labels[value] ?? value : 'Não informado'
const fieldClass = 'mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm dark:text-slate-100'

export default function AdminAutomacoes() {
  const query = useAdminQuery<Rule[]>(() => api.admin.getAutomations())
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState('ticket_created')
  const [status, setStatus] = useState('')
  const [action, setAction] = useState('notify_attendant')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const rules = query.data ?? []

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setSaveError(null); setMessage('')
    try {
      if (!name.trim() || !description.trim()) throw new Error('Preencha o nome e a descrição.')
      await api.admin.createAutomation({ name: name.trim(), description: description.trim(), trigger: { type: trigger }, conditions: status ? [{ field: 'status', operator: 'equals', value: status }] : [], actions: [{ type: action, ...(action === 'notify_attendant' ? { target: 'asa' } : {}) }], active: false })
      setOpen(false); setName(''); setDescription(''); setMessage('Definição salva como desabilitada. A execução automática ainda não está disponível.'); await query.refresh()
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Não foi possível registrar a regra.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Automações e Regras</h1><div className="flex gap-2"><button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm dark:text-slate-200"><RefreshCw size={16} /> Atualizar</button><button onClick={() => { setOpen(true); setSaveError(null); setMessage('') }} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white"><Plus size={16} /> Registrar regra</button></div></div>
    <p className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300">As definições abaixo estão salvas no sistema. O executor de automações ainda não está disponível; cadastrar uma regra não executa ações sobre alunos ou chamados.</p>
    {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[['Regras cadastradas', rules.length], ['Habilitadas no cadastro', rules.filter(rule => rule.active).length]].map(([title, value]) => <div key={title} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"><p className="text-sm text-gray-500 dark:text-slate-400">{title}</p><p className="text-2xl font-bold dark:text-slate-100">{value}</p></div>)}</div>
      <AdminDataState loading={false} error={null} onRetry={query.refresh} empty={!rules.length}><div className="space-y-4">{rules.map(rule => <article key={rule.id} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold dark:text-slate-100"><Zap size={20} className="text-amber-500" />{rule.name}</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{rule.description}</p></div><span className="text-xs text-gray-500 dark:text-slate-400">{rule.active ? 'Habilitada no cadastro' : 'Desabilitada no cadastro'}</span></div><div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-slate-300"><span className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">Gatilho: {label(rule.trigger?.type)}</span><ArrowRight size={16} /><span className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">Condições: {rule.conditions.length ? rule.conditions.map(condition => [label(condition.field), label(condition.operator), label(condition.value)].join(' ')).join('; ') : 'Nenhuma'}</span><ArrowRight size={16} /><span className="rounded-lg bg-brand-50 dark:bg-brand-950/30 p-2">Ações: {rule.actions.map(item => [label(item.type), item.target, item.value].filter(Boolean).join(' ')).join('; ') || 'Nenhuma'}</span></div><p className="mt-4 text-xs text-gray-500">Atualizada em {new Date(rule.updatedAt).toLocaleString('pt-BR')}</p></article>)}</div></AdminDataState>
    </AdminDataState>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-label="Registrar regra" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4"><div className="flex justify-between"><h2 className="text-lg font-bold dark:text-slate-100">Registrar definição de regra</h2><button type="button" disabled={saving} onClick={() => setOpen(false)} aria-label="Fechar"><X size={20} className="dark:text-slate-200" /></button></div><p className="text-sm text-gray-500 dark:text-slate-400">A regra será salva desabilitada, sem executar ações.</p>{saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
      <label className="block text-sm dark:text-slate-200">Nome<input required value={name} onChange={event => setName(event.target.value)} className={fieldClass} /></label>
      <label className="block text-sm dark:text-slate-200">Descrição<textarea required rows={3} value={description} onChange={event => setDescription(event.target.value)} className={fieldClass} /></label>
      <label className="block text-sm dark:text-slate-200">Gatilho<select value={trigger} onChange={event => setTrigger(event.target.value)} className={fieldClass}>{['ticket_created', 'ticket_updated', 'status_changed'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="block text-sm dark:text-slate-200">Condição de status<select value={status} onChange={event => setStatus(event.target.value)} className={fieldClass}><option value="">Qualquer status</option>{['aberto', 'em_andamento', 'resolvido', 'fechado'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="block text-sm dark:text-slate-200">Ação prevista<select value={action} onChange={event => setAction(event.target.value)} className={fieldClass}>{['notify_attendant', 'ai_analyze'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="px-4 py-2 text-sm dark:text-slate-300">Cancelar</button><button disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar definição'}</button></div>
    </form></div>}
  </div>
}
