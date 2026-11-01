import { useState } from 'react'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'
export default function AsaConversas() {
  const [search,setSearch] = useState('')
  const [selected,setSelected] = useState<string | null>(null)
  const list = useApiQuery(api.chat.getConversations)
  const detail = useApiQuery(() => selected ? api.chat.getConversation(selected) : Promise.resolve(null), [selected])
  const rows = (list.data ?? []).filter(c => [c.title,c.student?.name,c.lastMessage].join(' ').toLowerCase().includes(search.toLowerCase()))
  return <div className="p-4 md:p-6 space-y-5"><h1 className="text-2xl font-bold dark:text-white">Conversas com o assistente</h1><p className="text-sm text-gray-500">Últimas 100 conversas registradas. Selecione uma para consultar o histórico.</p><input aria-label="Buscar conversa" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por aluno ou assunto" className="w-full md:max-w-md p-3 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"/>
    <div className="grid md:grid-cols-[320px_1fr] gap-5"><section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4"><DataState loading={list.loading} error={list.error} onRetry={list.refresh} empty={!rows.length}>{rows.map(c=><button key={c.id} onClick={()=>setSelected(c.id)} aria-pressed={selected===c.id} className="text-left w-full border-b dark:border-slate-700 p-3 hover:bg-gray-50 dark:hover:bg-slate-700"><strong className="block text-sm dark:text-white">{c.student?.name ?? 'Aluno não identificado'}</strong><span className="block text-sm text-gray-500">{c.title}</span><time className="text-xs text-gray-400">{new Date(c.lastMessageTime).toLocaleString('pt-BR')}</time></button>)}</DataState></section>
    <section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5">{!selected ? <p className="text-gray-500">Selecione uma conversa.</p> : <DataState loading={detail.loading} error={detail.error} onRetry={detail.refresh} empty={!detail.data?.messages?.length}>{detail.data?.messages?.map((m:any)=><article key={m.id} className="border-b dark:border-slate-700 py-4"><p className="text-xs text-gray-500 mb-2">{m.role==='user'?'Aluno':'Assistente'} · {new Date(m.timestamp).toLocaleString('pt-BR')}</p><div className="text-sm dark:text-slate-200"><MarkdownRenderer content={m.content}/></div></article>)}</DataState>}</section></div>
  </div>
}
