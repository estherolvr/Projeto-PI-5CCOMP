import { useState, type FormEvent } from 'react'
import { Edit, Eye, FileText, Plus, RefreshCw, Search, Upload, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

export interface KnowledgeDocument {
  id: string; title: string; category: string; content: string; version: string; status: string
  author: string; tags: string[]; views: number; indexed: boolean; source: string
  filename?: string; chunkCount?: number; createdAt: string; updatedAt: string
}

const inputClass = 'w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100'
const categories = ['Acadêmico', 'Matrícula', 'Financeiro', 'Bolsas & Financiamento', 'Secretaria', 'Geral']
const emptyForm = { title: '', category: 'Acadêmico', content: '', tags: '', status: 'ativo', version: '1.0' }

export default function AdminBaseConhecimento() {
  const query = useAdminQuery<KnowledgeDocument[]>(() => api.kb.list())
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState<'manual' | 'upload' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [selected, setSelected] = useState<KnowledgeDocument | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const documents = query.data ?? []
  const visible = documents.filter(doc => (!category || doc.category === category) && [doc.title, doc.content, ...doc.tags].join(' ').toLowerCase().includes(search.toLowerCase()))

  function openEditor(doc?: KnowledgeDocument, upload = false) {
    setEditingId(doc?.id ?? null)
    setForm(doc ? { title: doc.title, category: doc.category, content: doc.content, tags: doc.tags.join(', '), status: doc.status, version: doc.version } : emptyForm)
    setFile(null); setActionError(null); setMessage(''); setMode(upload ? 'upload' : 'manual')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setActionError(null); setMessage('')
    try {
      if (mode === 'upload') {
        if (!file) throw new Error('Selecione um arquivo PDF, TXT ou Markdown.')
        if (file.size > 25 * 1024 * 1024) throw new Error('O arquivo deve ter até 25 MB.')
        const body = new FormData()
        body.append('file', file); body.append('title', form.title.trim()); body.append('category', form.category)
        await api.kb.upload(body)
      } else {
        const body = { ...form, title: form.title.trim(), content: form.content.trim(), tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean) }
        if (!body.title || !body.content) throw new Error('Preencha o título e o conteúdo.')
        if (editingId) await api.kb.update(editingId, body)
        else await api.kb.create(body)
      }
      setMode(null); setMessage('Documento salvo na base compartilhada com a equipe ASA.'); await query.refresh()
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível salvar o documento.') }
    finally { setSaving(false) }
  }

  async function view(doc: KnowledgeDocument) {
    setActionError(null)
    try { setSelected(await api.kb.get(doc.id)); await query.refresh() }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível abrir o documento.') }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Base de Conhecimento</h1><p className="text-sm text-gray-500 dark:text-slate-400">Documentos compartilhados com o atendimento ASA e o assistente dos alunos.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:text-slate-200 dark:border-slate-700"><RefreshCw size={16} /> Atualizar</button>
        <button onClick={() => openEditor(undefined, true)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:text-slate-200 dark:border-slate-700"><Upload size={16} /> Enviar arquivo</button>
        <button onClick={() => openEditor()} className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white"><Plus size={16} /> Novo artigo</button>
      </div>
    </div>
    {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
    {actionError && !mode && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[
        ['Documentos', documents.length], ['Disponíveis para consulta', documents.filter(doc => doc.indexed && doc.status === 'ativo').length],
        ['Rascunhos', documents.filter(doc => doc.status === 'rascunho').length], ['Visualizações registradas', documents.reduce((total, doc) => total + doc.views, 0)],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"><p className="text-sm text-gray-500 dark:text-slate-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-slate-100">{value.toLocaleString('pt-BR')}</p></div>)}</div>
      <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input aria-label="Buscar documentos" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar documentos..." className={inputClass + ' pl-10'} /></div><select aria-label="Categoria" value={category} onChange={event => setCategory(event.target.value)} className={inputClass + ' sm:w-auto'}><option value="">Todas as categorias</option>{Array.from(new Set([...categories, ...documents.map(doc => doc.category)])).map(value => <option key={value}>{value}</option>)}</select></div>
        <AdminDataState loading={false} error={null} onRetry={query.refresh} empty={!visible.length}>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-600 dark:text-slate-300"><thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase"><tr>{['Documento', 'Categoria', 'Status', 'Versão', 'Atualização', 'Ações'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{visible.map(doc => <tr key={doc.id}><td className="px-4 py-3 font-medium"><span className="flex items-center gap-2"><FileText size={16} />{doc.title}</span></td><td className="px-4 py-3">{doc.category}</td><td className="px-4 py-3">{doc.status}</td><td className="px-4 py-3">{doc.version}</td><td className="px-4 py-3">{new Date(doc.updatedAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3"><div className="flex gap-3"><button onClick={() => void view(doc)} aria-label={'Ler ' + doc.title} title="Ler documento"><Eye size={17} /></button><button onClick={() => openEditor(doc)} aria-label={'Editar ' + doc.title} title="Editar documento"><Edit size={17} /></button></div></td></tr>)}</tbody></table></div>
        </AdminDataState>
      </div>
    </AdminDataState>
    {mode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-label={editingId ? 'Editar documento' : 'Novo documento'} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold dark:text-slate-100">{editingId ? 'Editar documento' : mode === 'upload' ? 'Enviar documento' : 'Novo artigo'}</h2><button type="button" disabled={saving} onClick={() => setMode(null)} aria-label="Fechar"><X className="dark:text-slate-200" size={20} /></button></div>
      {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
      {mode === 'upload' && <label className="block text-sm dark:text-slate-200">Arquivo (PDF, TXT ou MD, até 25 MB)<input type="file" accept=".pdf,.txt,.md" required onChange={event => { const next = event.target.files?.[0] ?? null; setFile(next); if (next && !form.title) setForm({ ...form, title: next.name.replace(/\.[^.]+$/, '') }) }} className={inputClass + ' mt-1'} /></label>}
      <label className="block text-sm dark:text-slate-200">Título<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className={inputClass + ' mt-1'} /></label>
      <label className="block text-sm dark:text-slate-200">Categoria<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className={inputClass + ' mt-1'}>{Array.from(new Set([...categories, form.category])).map(value => <option key={value}>{value}</option>)}</select></label>
      {mode === 'manual' && <><div className="grid grid-cols-2 gap-3"><label className="text-sm dark:text-slate-200">Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className={inputClass + ' mt-1'}><option value="ativo">Ativo</option><option value="rascunho">Rascunho</option><option value="arquivado">Arquivado</option></select></label><label className="text-sm dark:text-slate-200">Versão<input required value={form.version} onChange={event => setForm({ ...form, version: event.target.value })} className={inputClass + ' mt-1'} /></label></div><label className="block text-sm dark:text-slate-200">Tags separadas por vírgula<input value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} className={inputClass + ' mt-1'} /></label><label className="block text-sm dark:text-slate-200">Conteúdo<textarea required rows={8} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} className={inputClass + ' mt-1'} /></label></>}
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setMode(null)} className="px-4 py-2 text-sm dark:text-slate-300">Cancelar</button><button disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar documento'}</button></div>
    </form></div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div role="dialog" aria-modal="true" aria-label={selected.title} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold dark:text-slate-100">{selected.title}</h2><p className="text-sm text-gray-500">{selected.category} · {selected.author} · Versão {selected.version}</p></div><button onClick={() => setSelected(null)} aria-label="Fechar documento"><X size={20} className="dark:text-slate-200" /></button></div><p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">{selected.content}</p></div></div>}
  </div>
}
