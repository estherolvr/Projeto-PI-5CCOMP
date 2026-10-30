import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Check, Clock, AlertTriangle, User, Paperclip, Send, BrainCircuit, 
  ThumbsDown, ChevronDown, ChevronUp, Bot, Sparkles, UserCheck, ArrowLeft, Lock, MessageSquare
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime, formatRelative, cn } from '../../lib/utils';
import { useAppStore } from '../../store/app-store';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';

export default function AsaDetalheChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [showChatContext, setShowChatContext] = useState(true);

  const fetchTicket = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await api.tickets.get(id);
      setTicket(data);
      setMessages((data as any).messages || []);
    } catch (err) {
      console.error('Erro ao carregar chamado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleSend = async () => {
    if (!replyText.trim() || !ticket) return;
    setIsSending(true);

    try {
      const createdMsg = await api.tickets.addMessage(ticket.id, {
        content: replyText.trim(),
        isInternal: isInternalNote,
      });

      setMessages(prev => [...prev, createdMsg]);
      setReplyText('');
      setIsInternalNote(false);

      // Refresh ticket details
      const updated = await api.tickets.get(ticket.id);
      setTicket(updated);
    } catch (err) {
      console.error('Erro ao enviar resposta:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!ticket) return;
    try {
      const updated = await api.tickets.update(ticket.id, { status: newStatus as any });
      setTicket(updated);
      setStatusDropdownOpen(false);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!ticket) return;
    try {
      const updated = await api.tickets.update(ticket.id, { priority: newPriority as any });
      setTicket(updated);
      setPriorityDropdownOpen(false);
    } catch (err) {
      console.error('Erro ao atualizar prioridade:', err);
    }
  };

  const handleAssignToMe = async () => {
    if (!ticket) return;
    try {
      const updated = await api.tickets.update(ticket.id, {
        assignedTo: currentUser?.id || 'asa-01',
        status: ticket.status === 'aberto' ? 'em_atendimento' : ticket.status,
      });
      setTicket(updated);
    } catch (err) {
      console.error('Erro ao assumir chamado:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full mb-2" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Chamado não encontrado</h2>
        <button onClick={() => navigate('/asa/chamados')} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg">
          Voltar para a fila
        </button>
      </div>
    );
  }

  const student = ticket.student;
  const isAssignedToMe = ticket.attendant?.id === currentUser?.id;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-gray-50 dark:bg-slate-900">
      
      {/* LEFT COLUMN: Ticket & Student Info */}
      <div className="w-full md:w-[300px] flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto p-4 flex flex-col gap-6">
        <div>
          <button onClick={() => navigate('/asa/chamados')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white mb-3">
            <ArrowLeft size={14} /> Voltar à fila
          </button>

          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
            <span className="font-bold text-gray-900 dark:text-white font-mono">#{ticket.number}</span>
            <span>•</span>
            <span className="capitalize px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700">{ticket.category}</span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-snug mb-4">{ticket.title}</h2>
          
          <div className="space-y-3.5">
            {/* Status Dropdown */}
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Status do Chamado</label>
              <button 
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold capitalize"
              >
                <span>{ticket.status.replace('_', ' ')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {statusDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden text-xs">
                  {['aberto', 'em_atendimento', 'aguardando_aluno', 'resolvido', 'fechado'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 capitalize text-gray-700 dark:text-slate-200"
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Dropdown */}
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Prioridade</label>
              <button 
                onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-semibold uppercase"
              >
                <span>{ticket.priority}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {priorityDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden text-xs">
                  {['baixa', 'media', 'alta', 'critica'].map(pr => (
                    <button
                      key={pr}
                      onClick={() => handleUpdatePriority(pr)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 uppercase font-semibold text-gray-700 dark:text-slate-200"
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Responsible Attendant */}
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Responsável</label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                    {(ticket.attendant?.name || 'A').charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate max-w-[120px]">
                    {ticket.attendant?.name || 'Não atribuído'}
                  </span>
                </div>
                {!isAssignedToMe && (
                  <button onClick={handleAssignToMe} className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                    Assumir
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Prazo de SLA</label>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                <Clock className="w-4 h-4" /> {formatDateTime(ticket.slaDeadline)}
              </div>
            </div>
          </div>
        </div>

        {/* Student Info Card */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" /> Dados Acadêmicos
          </h3>
          {student ? (
            <div className="space-y-2 text-xs">
              <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{student.name}</p>
              <p className="text-gray-500">RA: <strong className="font-mono text-gray-800 dark:text-slate-200">{student.ra}</strong></p>
              <p className="text-gray-500">{student.course} · <strong>{student.semester}º Semestre</strong></p>
              <p className="text-gray-500 capitalize">Turno: {student.period} · {student.email}</p>
              <span className="inline-block px-2 py-0.5 mt-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-medium rounded-full">
                Matrícula {student.status}
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Estudante não identificado.</p>
          )}
        </div>
      </div>

      {/* CENTER COLUMN: Chat / Timeline */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 min-w-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {/* Linked AI Chat Conversation History (Pre-attendance) */}
          {ticket.conversation && ticket.conversation.messages && ticket.conversation.messages.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800/60 rounded-xl overflow-hidden shadow-xs mb-4">
              <div 
                onClick={() => setShowChatContext(!showChatContext)}
                className="p-3.5 bg-gradient-to-r from-brand-50/80 to-transparent dark:from-brand-900/30 flex items-center justify-between cursor-pointer hover:bg-brand-50/90 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>Histórico do Chat com IA (Pré-Atendimento)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300">
                        {ticket.conversation.messages.length} mensagens
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      Veja exatamente o que o aluno perguntou e o que a IA respondeu antes do chamado ser aberto.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400">
                  <span>{showChatContext ? 'Recolher' : 'Expandir diálogo'}</span>
                  {showChatContext ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {showChatContext && (
                <div className="p-4 bg-gray-50/60 dark:bg-slate-900/60 border-t border-brand-100 dark:border-brand-800/40 max-h-72 overflow-y-auto space-y-3">
                  {ticket.conversation.messages.map((m: any) => (
                    <div
                      key={m.id}
                      className={cn(
                        "p-3.5 rounded-xl text-xs max-w-[88%]",
                        m.role === 'user'
                          ? "ml-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xs text-gray-800 dark:text-slate-100 rounded-tr-xs"
                          : "mr-auto bg-brand-50/90 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-800/50 text-gray-800 dark:text-slate-200 rounded-tl-xs"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px] text-gray-400">
                        <span className="font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300">
                          {m.role === 'user' ? 'Aluno (no Chatbot)' : 'Álvaro AI (Resposta RAG)'}
                        </span>
                        <span>{formatRelative(m.timestamp)}</span>
                      </div>
                      <MarkdownRenderer content={m.content} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg: any) => {
            const isASA = msg.senderRole === 'asa' || msg.senderRole === 'admin';
            const isAI = msg.senderRole === 'sistema' || msg.senderRole === 'ia';
            const isInternal = msg.isInternal;

            return (
              <div key={msg.id} className={`flex flex-col ${isASA ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    {isInternal && <Lock size={12} className="text-amber-600" />}
                    {isAI ? 'Álvaro AI (Agente Automático)' : msg.senderName}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(msg.createdAt || msg.timestamp)}</span>
                </div>
                <div className={cn(
                  "max-w-[85%] p-4 rounded-2xl text-sm shadow-sm",
                  isInternal
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                    : isASA 
                    ? 'bg-brand-600 text-white rounded-tr-none' 
                    : isAI
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-gray-800 dark:text-slate-200 border border-brand-100 dark:border-brand-800 rounded-tl-none'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-100 dark:border-slate-700 rounded-tl-none'
                )}>
                  {isInternal && (
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-xs mb-1">
                      <Lock size={12} /> Nota Interna (Visível apenas para o ASA)
                    </div>
                  )}
                  {isAI && (
                    <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 mb-2 font-medium text-xs">
                      <Bot className="w-4 h-4" /> Resposta Automática
                    </div>
                  )}
                  <MarkdownRenderer content={msg.content} isUserMessage={isASA && !isInternal} />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Reply Area */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setIsInternalNote(false)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5",
                !isInternalNote ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
              )}
            >
              <MessageSquare size={13} /> Resposta ao Aluno
            </button>
            <button
              onClick={() => setIsInternalNote(true)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5",
                isInternalNote ? "bg-amber-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
              )}
            >
              <Lock size={13} /> Nota Interna
            </button>
          </div>

          <div className="relative">
            <textarea 
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={isInternalNote ? "Escreva uma nota interna sobre este chamado..." : "Digite sua resposta para o aluno..."}
              className="w-full min-h-[90px] p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none text-sm dark:text-slate-100"
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex gap-2">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                {ticket.aiSuggestion?.recommendation && (
                  <button 
                    onClick={() => setReplyText(ticket.aiSuggestion.recommendation)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-700 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Usar recomendação da IA
                  </button>
                )}
              </div>

              <button 
                onClick={handleSend}
                disabled={!replyText.trim() || isSending}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                {isSending ? 'Enviando...' : isInternalNote ? 'Salvar Nota' : 'Enviar Resposta'} <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: AI Analysis */}
      <div className="w-full md:w-[320px] flex-shrink-0 border-l border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-brand-50/50 dark:bg-brand-900/10">
          <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 font-semibold text-sm">
            <BrainCircuit className="w-5 h-5" />
            Análise Preditiva Álvaro AI
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-auto"></span>
          </div>
        </div>
        
        {ticket.aiSuggestion ? (
          <div className="p-4 space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Intenção Identificada</h4>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{ticket.aiSuggestion.intent}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${(ticket.aiSuggestion.confidence || 0.9) * 100}%` }}></div>
                </div>
                <span className="text-xs font-mono font-medium text-gray-500">{Math.round((ticket.aiSuggestion.confidence || 0.9) * 100)}%</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Resumo Executivo</h4>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                {ticket.aiSuggestion.summary}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs rounded font-medium capitalize">
                Cat: {ticket.aiSuggestion.category}
              </span>
              <span className={cn(
                "px-2 py-0.5 text-xs rounded font-medium capitalize flex items-center gap-1",
                ticket.aiSuggestion.sentiment === 'negativo' ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" :
                ticket.aiSuggestion.sentiment === 'positivo' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
              )}>
                {ticket.aiSuggestion.sentiment === 'negativo' && <ThumbsDown size={11} />}
                Sentimento: {ticket.aiSuggestion.sentiment}
              </span>
            </div>

            <div className="bg-brand-50 dark:bg-brand-900/20 p-3.5 rounded-xl border border-brand-100 dark:border-brand-800/30 space-y-2">
              <h4 className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> Recomendação da IA
              </h4>
              <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">{ticket.aiSuggestion.recommendation}</p>
              <button 
                onClick={() => setReplyText(ticket.aiSuggestion.recommendation)}
                className="w-full py-1.5 bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-400 text-xs font-semibold rounded-lg shadow-sm hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Copiar para resposta
              </button>
            </div>

            {ticket.conversation && (
              <div className="p-3 bg-brand-50/50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-brand-800 dark:text-brand-300">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={14} /> Chat de Pré-Atendimento
                  </span>
                  <span className="font-mono text-[11px] bg-brand-100 dark:bg-brand-900 px-1.5 py-0.5 rounded">
                    {ticket.conversation.messages?.length || 0} msgs
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  O histórico completo da conversa pode ser visualizado no painel central acima das mensagens.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-400">
            Nenhuma análise de IA disponível para este chamado.
          </div>
        )}
      </div>
    </motion.div>
  );
}
