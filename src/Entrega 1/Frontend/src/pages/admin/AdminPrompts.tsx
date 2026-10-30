import { useState, type FormEvent } from 'react'
import { Edit, RefreshCw, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

interface Prompt { id: string; name: string; description: string; content: string; version: string; status: string; author: string; updatedAt: string }
const fieldClass = 'mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm text-gray-900 dark:text-slate-100'

export default function AdminPrompts() {
  const query = useAdminQuery<Prompt[]>(() => api.admin.getPrompts())
  const [editing, setEditing] = useState<Prompt | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const prompts = query.data ?? []

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    setSaving(true); setSaveError(null); setMessage('')
    try {
      if (!editing.name.trim() || !editing.content.trim() || !editing.version.trim()) throw new Error('Preencha nome, versão e conteúdo.')
      await api.admin.updatePrompt(editing.id, { name: editing.name.trim(), description: editing.description, content: editing.content.trim(), version: editing.version.trim(), status: editing.status })
      setEditing(null); setMessage('Prompt atualizado no servidor.'); await query.refresh()
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o prompt.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Gerenciamento de Prompts</h1><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Configurações de prompts cadastradas no servidor.</p></div><button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm dark:text-slate-200"><RefreshCw size={16} /> Atualizar</button></div>
    {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[
        ['Cadastrados', prompts.length], ['Status ativo', prompts.filter(prompt => prompt.status === 'ativo').length], ['Status teste', prompts.filter(prompt => prompt.status === 'teste').length],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"><p className="text-sm text-gray-500 dark:text-slate-400">{label}</p><p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p></div>)}</div>
      <AdminDataState loading={false} error={null} onRetry={query.refresh} empty={!prompts.length}><div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800"><table className="w-full text-left text-sm text-gray-600 dark:text-slate-300"><thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase"><tr>{['Nome', 'Versão', 'Status cadastrado', 'Autor', 'Atualização', 'Ações'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{prompts.map(prompt => <tr key={prompt.id}><td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-slate-100">{prompt.name}</p><p className="text-xs text-gray-500">{prompt.description}</p></td><td className="px-4 py-3">{prompt.version}</td><td className="px-4 py-3">{prompt.status}</td><td className="px-4 py-3">{prompt.author}</td><td className="px-4 py-3">{new Date(prompt.updatedAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3"><button aria-label={'Editar ' + prompt.name} onClick={() => { setEditing({ ...prompt }); setSaveError(null); setMessage('') }} className="flex items-center gap-1 text-brand-600 dark:text-brand-400"><Edit size={16} /> Editar</button></td></tr>)}</tbody></table></div></AdminDataState>
    </AdminDataState>
    <p className="text-sm text-gray-500 dark:text-slate-400">Métricas de uso, testes A/B e histórico de versões não estão disponíveis. O status acima representa o cadastro do prompt.</p>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-label="Editar prompt" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-bold dark:text-slate-100">Editar prompt</h2><button type="button" disabled={saving} onClick={() => setEditing(null)} aria-label="Fechar"><X size={20} className="dark:text-slate-200" /></button></div>
      {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
      <label className="block text-sm dark:text-slate-200">Nome<input required value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} className={fieldClass} /></label>
      <label className="block text-sm dark:text-slate-200">Descrição<input value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} className={fieldClass} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm dark:text-slate-200">Versão<input required value={editing.version} onChange={event => setEditing({ ...editing, version: event.target.value })} className={fieldClass} /></label><label className="text-sm dark:text-slate-200">Status<select value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value })} className={fieldClass}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="teste">Teste</option></select></label></div>
      <label className="block text-sm dark:text-slate-200">Conteúdo<textarea required rows={12} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} className={fieldClass + ' font-mono'} /></label>
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setEditing(null)} className="px-4 py-2 text-sm dark:text-slate-300">Cancelar</button><button disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar alterações'}</button></div>
    </form></div>}
  </div>
}
