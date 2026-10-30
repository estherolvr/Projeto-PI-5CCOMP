import { useState, type FormEvent } from 'react'
import { Database, RefreshCw, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import type { KnowledgeDocument } from './AdminBaseConhecimento'

interface Match { docId: string; docTitle: string; category: string; content: string; score: number }

export default function AdminRAG() {
  const query = useAdminQuery<KnowledgeDocument[]>(() => api.kb.list())
  const [search, setSearch] = useState('')
  const [testQuery, setTestQuery] = useState('')
  const [results, setResults] = useState<Match[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const documents = query.data ?? []
  const available = documents.filter(doc => doc.indexed && doc.status === 'ativo')
  const visible = documents.filter(doc => [doc.title, doc.filename ?? '', doc.category].join(' ').toLowerCase().includes(search.toLowerCase()))

  async function testSearch(event: FormEvent) {
    event.preventDefault()
    if (!testQuery.trim()) return
    setSearching(true); setSearchError(null); setResults(null)
    try { setResults(await api.kb.search(testQuery.trim())) }
    catch (error) { setSearchError(error instanceof Error ? error.message : 'Não foi possível consultar a base.') }
    finally { setSearching(false) }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2"><Database size={24} /> RAG — Documentos e consulta</h1><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Acompanhe os documentos usados como contexto pelo assistente dos alunos.</p></div><button onClick={() => void query.refresh()} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white"><RefreshCw size={16} /> Atualizar</button></div>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[
        ['Documentos cadastrados', documents.length], ['Disponíveis para consulta', available.length],
        ['Trechos registrados na base', available.reduce((total, doc) => total + (doc.chunkCount ?? 0), 0)],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"><p className="text-sm text-gray-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{value.toLocaleString('pt-BR')}</p></div>)}</div>
      <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-4 justify-between"><h2 className="font-semibold text-gray-900 dark:text-slate-100">Documentos da base ASA</h2><input aria-label="Filtrar documentos" placeholder="Buscar documento..." value={search} onChange={event => setSearch(event.target.value)} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-sm dark:text-slate-100" /></div>
        <AdminDataState loading={false} error={null} onRetry={query.refresh} empty={!visible.length}><div className="overflow-x-auto"><table className="w-full text-left text-sm text-gray-600 dark:text-slate-300"><thead className="bg-gray-50 dark:bg-slate-900 text-xs uppercase"><tr>{['Documento', 'Trechos registrados', 'Disponibilidade', 'Atualização do documento'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{visible.map(doc => <tr key={doc.id}><td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-slate-100">{doc.title}</p>{doc.filename && <p className="text-xs text-gray-500">{doc.filename}</p>}</td><td className="px-4 py-3">{doc.chunkCount ?? 'Não informado'}</td><td className="px-4 py-3">{doc.status !== 'ativo' ? doc.status : doc.indexed ? 'Disponível para consulta' : 'Não indexado'}</td><td className="px-4 py-3">{new Date(doc.updatedAt).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div></AdminDataState>
      </div>
    </AdminDataState>
    <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900 dark:text-slate-100">Testar recuperação de contexto</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400">Consulta a mesma busca textual do assistente. Quando não há correspondência, o serviço pode retornar documentos recentes como contexto.</p>
      <form onSubmit={testSearch} className="flex gap-2"><input required value={testQuery} onChange={event => setTestQuery(event.target.value)} aria-label="Pergunta para consultar a base" placeholder="Ex.: Como solicitar uma declaração?" className="min-w-0 flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-sm dark:text-slate-100" /><button disabled={searching || !testQuery.trim()} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-white text-sm disabled:opacity-50"><Search size={16} /> {searching ? 'Buscando...' : 'Consultar'}</button></form>
      {searchError && <p role="alert" className="text-sm text-red-600">{searchError}</p>}
      {results && <div className="space-y-3">{results.length === 0 && <p className="text-sm text-gray-500">Nenhum documento disponível para a consulta.</p>}{results.map(result => <article key={result.docId} className="rounded-lg bg-gray-50 dark:bg-slate-900 p-4"><h3 className="font-medium text-gray-900 dark:text-slate-100">{result.docTitle}</h3><p className="mb-2 text-xs text-gray-500">{result.category} · Pontuação textual: {result.score}</p><p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">{result.content}</p></article>)}</div>}
    </div>
    <p className="text-sm text-gray-500 dark:text-slate-400">Telemetria de embeddings e histórico de indexação não estão disponíveis. Os documentos são processados ao serem criados ou editados na Base de Conhecimento.</p>
  </div>
}
