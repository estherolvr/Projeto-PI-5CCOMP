import { MessagesSquare, Search, MessageCircle, UserRound, Bot } from 'lucide-react'
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
  return <div className="conversation-workspace p-4 md:p-8 space-y-5"><div className="section-kicker"><MessagesSquare size={16}/> ACOMPANHAMENTO DO ALUNO</div><h1 className="text-2xl font-bold dark:text-white">Conversas com o assistente</h1><p className="text-sm text-gray-500">Últimas 100 conversas registradas. Selecione uma para consultar o histórico.</p><div className="conversation-search"><Search size={18}/><input aria-label="Buscar conversa" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por aluno ou assunto" className="w-full md:max-w-md p-3 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"/></div>
    <div className="conversation-columns grid md:grid-cols-[340px_1fr] gap-0"><section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4"><DataState loading={list.loading} error={list.error} onRetry={list.refresh} empty={!rows.length}>{rows.map(c=><button key={c.id} onClick={()=>setSelected(c.id)} aria-pressed={selected===c.id} className="conversation-item text-left w-full border-b dark:border-slate-700 p-3 hover:bg-gray-50 dark:hover:bg-slate-700"><UserRound size={18} className="conversation-person"/><strong className="block text-sm dark:text-white">{c.student?.name ?? 'Aluno não identificado'}</strong><span className="block text-sm text-gray-500">{c.title}</span><time className="text-xs text-gray-400">{new Date(c.lastMessageTime).toLocaleString('pt-BR')}</time></button>)}</DataState></section>
    <section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5">{!selected ? <div className="conversation-empty"><MessageCircle size={40} strokeWidth={1.3}/><h2>O contexto de cada atendimento</h2><p>Selecione uma conversa ao lado para acompanhar o histórico entre o aluno e o assistente.</p></div> : <DataState loading={detail.loading} error={detail.error} onRetry={detail.refresh} empty={!detail.data?.messages?.length}>{detail.data?.messages?.map((m:any)=><article key={m.id} className={`conversation-message ${m.role==='user'?'from-student':'from-assistant'} border-b dark:border-slate-700 py-4`}><p className="text-xs text-gray-500 mb-2">{m.role==='user'?'Aluno':'Assistente'} · {new Date(m.timestamp).toLocaleString('pt-BR')}</p><div className="text-sm dark:text-slate-200"><MarkdownRenderer content={m.content}/></div></article>)}</DataState>}</section></div>
  </div>
}
