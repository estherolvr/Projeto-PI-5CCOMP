import { Bot, Clock3, Copy, FileText, Image as ImageIcon, MessagesSquare, PanelRight, Paperclip, Search, SlidersHorizontal, Sparkles, UserRound, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

function dayLabel(timestamp: string) {
  const date = new Date(timestamp), today = new Date(), yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AsaConversas() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [period, setPeriod] = useState('all')
  const [messageSearch, setMessageSearch] = useState('')
  const [studentInfoOpen, setStudentInfoOpen] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const historyRef = useRef<HTMLDivElement>(null)
  const messageSearchRef = useRef<HTMLInputElement>(null)
  const list = useApiQuery(api.chat.getConversations)
  const detail = useApiQuery(() => selected ? api.chat.getConversation(selected) : Promise.resolve(null), [selected])
  const rows = useMemo(() => {
    const cutoff = period === '7d' ? Date.now() - 7 * 86400000 : period === '30d' ? Date.now() - 30 * 86400000 : 0
    const term = search.trim().toLowerCase()
    return (list.data ?? []).filter(c => [c.title, c.student?.name, c.student?.ra, c.lastMessage].join(' ').toLowerCase().includes(term) && new Date(c.lastMessageTime).getTime() >= cutoff)
  }, [list.data, period, search])
  const active = (list.data ?? []).find(c => c.id === selected)
  const messages = (detail.data?.messages ?? []).filter((message: any) => !messageSearch.trim() || String(message.content).toLowerCase().includes(messageSearch.trim().toLowerCase()))

  useEffect(() => { if (detail.data?.messages?.length) historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight }) }, [detail.data, selected])

  function openConversation(id: string) {
    setSelected(id); setMessageSearch(''); setDownloadError(''); setStudentInfoOpen(false)
  }
  async function downloadAttachment(messageId: string, file: any) {
    if (!selected) return
    setDownloadError('')
    try { await api.chat.downloadAttachment(selected, messageId, file.id, file.name) }
    catch (error) { setDownloadError(error instanceof Error ? error.message : 'Não foi possível baixar o anexo.') }
  }

  return <div className="conversation-workspace p-4 md:p-8 space-y-5">
    <header className="conversation-page-heading"><div><div className="section-kicker"><MessagesSquare size={16}/> CENTRAL DE ATENDIMENTO</div><h1>Conversas com o assistente</h1><p>Acompanhe as interações entre alunos e Álvaro AI.</p></div><span className="conversation-count">{rows.length} conversas</span></header>
    <div className="conversation-filters">
      <label className="conversation-search"><Search size={18}/><input aria-label="Buscar conversa" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por aluno, RA ou assunto"/>{search && <button aria-label="Limpar busca" onClick={() => setSearch('')}><X size={15}/></button>}</label>
      <label className="conversation-period"><SlidersHorizontal size={16}/><span>Período</span><select aria-label="Filtrar conversas por período" value={period} onChange={event => setPeriod(event.target.value)}><option value="all">Todo o histórico</option><option value="30d">Últimos 30 dias</option><option value="7d">Últimos 7 dias</option></select></label>
    </div>
    <div className="conversation-columns">
      <section className="conversation-list-panel">
        <div className="conversation-list-heading"><div><strong>Mensagens</strong><span>Histórico real de atendimentos</span></div><MessagesSquare size={18}/></div>
        <DataState loading={list.loading} error={list.error} onRetry={list.refresh} empty={!rows.length}>{rows.map(conversation => <button key={conversation.id} onClick={() => openConversation(conversation.id)} aria-pressed={selected === conversation.id} className="conversation-item">
          <span className="conversation-avatar"><UserRound size={19}/>{conversation.unread && <i aria-label="Não lida"/>}</span><span className="conversation-item-copy"><span className="conversation-item-top"><strong>{conversation.student?.name ?? 'Aluno não identificado'}</strong><time>{new Date(conversation.lastMessageTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time></span><span className="conversation-preview-title">{conversation.title}</span><span className="conversation-preview"><span>{conversation.lastMessage || 'Conversa iniciada'}</span>{conversation.aiHandled ? <Bot size={12} aria-label="Atendida pela IA"/> : <Clock3 size={12}/>}</span></span>
        </button>)}</DataState>
      </section>
      <section className="conversation-chat-panel">{!selected ? <div className="conversation-empty"><span className="conversation-empty-icon"><Sparkles size={25}/></span><h2>Suas conversas, em contexto</h2><p>Selecione um aluno na lista para acompanhar todo o histórico da conversa com o assistente.</p></div> : <>
        <header className="conversation-chat-header"><span className="conversation-avatar large"><UserRound size={21}/></span><div><strong>{active?.student?.name ?? 'Aluno não identificado'}</strong><span><i className="assistant-presence"/> Conversa com Álvaro AI · {active ? new Date(active.lastMessageTime).toLocaleString('pt-BR') : ''}</span></div><button aria-label="Pesquisar nesta conversa" className="conversation-icon-button" onClick={() => messageSearchRef.current?.focus()}><Search size={17}/></button><button aria-label="Informações do aluno" aria-pressed={studentInfoOpen} onClick={() => setStudentInfoOpen(value => !value)} className="conversation-icon-button"><PanelRight size={17}/></button></header>
        <div className="conversation-chat-tools"><label><Search size={15}/><input ref={messageSearchRef} aria-label="Buscar nas mensagens" placeholder="Buscar nesta conversa" value={messageSearch} onChange={event => setMessageSearch(event.target.value)}/></label><span>{messageSearch ? `${messages.length} resultado${messages.length === 1 ? '' : 's'}` : 'Histórico completo'}</span>{messageSearch && <button aria-label="Fechar busca" onClick={() => setMessageSearch('')}><X size={15}/></button>}</div>
        {downloadError && <div className="conversation-download-error" role="alert">{downloadError}<button aria-label="Fechar erro" onClick={() => setDownloadError('')}><X size={14}/></button></div>}
        <div className="conversation-chat-body"><div className="conversation-history" ref={historyRef}><DataState loading={detail.loading} error={detail.error} onRetry={detail.refresh} empty={!messages.length}>{messages.map((message: any, index: number) => {
          const previous = messages[index - 1], showDay = !previous || new Date(previous.timestamp).toDateString() !== new Date(message.timestamp).toDateString()
          return <Fragment key={message.id}>{showDay && <div className="conversation-date-divider"><span>{dayLabel(message.timestamp)}</span></div>}<article className={`conversation-message ${message.role === 'user' ? 'from-student' : 'from-assistant'}`}><span className="message-avatar">{message.role === 'user' ? <UserRound size={15}/> : <Bot size={15}/>}</span><div className="message-content"><div className="message-meta"><span>{message.role === 'user' ? 'Aluno' : 'Álvaro AI'}</span><time>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><button aria-label="Copiar mensagem" title="Copiar mensagem" onClick={() => void navigator.clipboard?.writeText(message.content)}><Copy size={12}/></button></div><div className="text-sm dark:text-slate-200"><MarkdownRenderer content={message.content}/></div>{message.attachments?.length > 0 && <div className="conversation-attachments">{message.attachments.map((file: any) => <button key={file.id} onClick={() => void downloadAttachment(message.id, file)}><span>{file.type?.startsWith('image/') ? <ImageIcon size={15}/> : <FileText size={15}/>}</span><span><strong>{file.name}</strong><small><Paperclip size={11}/> Abrir anexo</small></span></button>)}</div>}</div></article></Fragment>
        })}</DataState></div>{studentInfoOpen && <aside className="conversation-student-panel"><button aria-label="Fechar informações" onClick={() => setStudentInfoOpen(false)}><X size={16}/></button><span className="conversation-avatar large"><UserRound/></span><h3>{active?.student?.name ?? 'Aluno'}</h3><p>Informações acadêmicas disponíveis</p><dl><dt>RA</dt><dd>{active?.student?.ra || 'Não informado'}</dd><dt>Identificação</dt><dd>{active?.studentId || active?.student?.id || 'Não informado'}</dd></dl></aside>}</div>
      </>}</section>
    </div>
  </div>
}
