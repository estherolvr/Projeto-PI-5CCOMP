import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Plus, ArrowLeft, Bot, Book, Sparkles, MessageSquare, Loader2, Ticket as TicketIcon, Cloud, Download, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatRelative, cn } from '../../lib/utils';
import { api } from '../../lib/api';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';

export default function AlunoChat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q');
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState(initialQuery || '');
  const [isLoadingConv, setIsLoadingConv] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile
  const [evaluatedMessages, setEvaluatedMessages] = useState<Record<string, 'positive' | 'negative'>>({});

  const handleFeedback = async (msg: any, type: 'positive' | 'negative') => {
    if (evaluatedMessages[msg.id]) return;
    setEvaluatedMessages(prev => ({ ...prev, [msg.id]: type }));
    try {
      await api.chat.sendFeedback({
        conversationId: activeConvId,
        messageId: msg.id,
        type,
        snippet: (msg.content || '').slice(0, 200),
        comment: type === 'positive' ? 'Aluno avaliou resposta como útil.' : 'Aluno avaliou que a resposta precisa de ajustes.',
      });
    } catch (e) {
      console.error('Erro ao enviar feedback:', e);
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const LOCAL_CONVERSATIONS_KEY = 'asaia_student_conversations';
  const LOCAL_MESSAGES_KEY_PREFIX = 'asaia_chat_messages_';

  const getLocalConversations = (): any[] => {
    try {
      const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveLocalConversations = (convList: any[]) => {
    try {
      localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(convList));
    } catch (e) {}
  };

  const getLocalMessages = (convId: string): any[] => {
    try {
      const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY_PREFIX}${convId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveLocalMessages = (convId: string, msgs: any[]) => {
    try {
      localStorage.setItem(`${LOCAL_MESSAGES_KEY_PREFIX}${convId}`, JSON.stringify(msgs));
    } catch (e) {}
  };

  const loadConversation = async (convId: string) => {
    // Carrega instantaneamente do cache local se existir
    const cached = getLocalMessages(convId);
    if (cached && cached.length > 0) {
      setActiveConvId(convId);
      setMessages(cached);
    }

    try {
      setIsLoadingConv(!cached || cached.length === 0);
      const conv = await api.chat.getConversation(convId);
      if (conv) {
        setActiveConvId(conv.id);
        const serverMsgs = conv.messages || [];
        setMessages(serverMsgs);
        saveLocalMessages(conv.id, serverMsgs);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens da conversa:', err);
    } finally {
      setIsLoadingConv(false);
    }
  };

  const fetchConversations = async () => {
    try {
      let list = await api.chat.getConversations().catch(() => []);
      const localConvs = getLocalConversations();

      if (list && list.length > 0) {
        setConversations(list);
        saveLocalConversations(list);
        if (!activeConvId) {
          await loadConversation(list[0].id);
        }
      } else if (localConvs && localConvs.length > 0) {
        setConversations(localConvs);
        if (!activeConvId) {
          await loadConversation(localConvs[0].id);
        }
      } else {
        const newConv = await api.chat.createConversation('Atendimento Álvaro AI');
        const initialList = [newConv];
        setConversations(initialList);
        saveLocalConversations(initialList);
        setActiveConvId(newConv.id);
        setMessages(newConv.messages || []);
        saveLocalMessages(newConv.id, newConv.messages || []);
        setIsLoadingConv(false);
      }
    } catch (err) {
      console.error('Erro ao listar conversas:', err);
      const fallback = getLocalConversations();
      if (fallback.length) {
        setConversations(fallback);
        if (!activeConvId) loadConversation(fallback[0].id);
      }
      setIsLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialQuery && activeConvId && !isLoadingConv) {
      handleSend(initialQuery);
    }
  }, [initialQuery, activeConvId, isLoadingConv]);

  const handleCreateNewConversation = async () => {
    try {
      setIsLoadingConv(true);
      const newConv = await api.chat.createConversation('Nova Conversa com Álvaro AI');
      const updatedList = [newConv, ...conversations];
      setConversations(updatedList);
      saveLocalConversations(updatedList);
      setActiveConvId(newConv.id);
      setMessages(newConv.messages || []);
      saveLocalMessages(newConv.id, newConv.messages || []);
      setShowSidebar(false);
    } catch (err) {
      console.error('Erro ao criar conversa:', err);
    } finally {
      setIsLoadingConv(false);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setShowSidebar(false);
    await loadConversation(convId);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !activeConvId || isTyping) return;

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const updatedWithUser = [...(messages || []), tempUserMsg];
    setMessages(updatedWithUser);
    saveLocalMessages(activeConvId, updatedWithUser);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await api.chat.sendMessage(activeConvId, text);
      if (response?.aiMessage) {
        const updatedWithAi = [...updatedWithUser, response.aiMessage];
        setMessages(updatedWithAi);
        saveLocalMessages(activeConvId, updatedWithAi);
        // Refresh conversation list preview
        api.chat.getConversations().then(res => {
          if (res?.length) {
            setConversations(res);
            saveLocalConversations(res);
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      const errMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu uma instabilidade momentânea ao processar sua dúvida. Por favor, tente novamente.',
        timestamp: new Date().toISOString(),
      };
      const updatedWithErr = [...updatedWithUser, errMessage];
      setMessages(updatedWithErr);
      saveLocalMessages(activeConvId, updatedWithErr);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExportConversation = () => {
    if (!messages || messages.length === 0) return;
    const activeConv = conversations.find(c => c.id === activeConvId);
    const exportData = {
      title: activeConv?.title || 'Conversa Álvaro AI',
      conversationId: activeConvId,
      exportedAt: new Date().toISOString(),
      storage: 'Cloudflare R2 Object Storage',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversa-alvaro-${(activeConvId || 'export').slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleActionClick = (action: string) => {
    if (action === 'novo-chamado' || action === 'open_ticket') {
      navigate(`/aluno/chamados/novo?conversationId=${activeConvId}`);
    } else if (action === 'fila' || action === 'meus-chamados') {
      navigate('/aluno/chamados');
    } else if (action === 'documentos' || action === 'documents') {
      navigate('/aluno/documentos');
    } else if (action === 'agendamento' || action === 'schedule') {
      navigate('/aluno/agendamento');
    } else if (action === 'kb') {
      navigate('/aluno/documentos');
    } else {
      handleSend(`Gostaria de saber mais detalhes sobre ${action}`);
    }
  };

  const suggestions = [
    'Quais são os prazos e regras do TCC?',
    'Como emitir 2ª via de boleto?',
    'Como solicito Atestado de Matrícula?',
    'Quero falar com a equipe ASA'
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
      
      {/* Sidebar - Conversas */}
      <div className={cn(
        "w-full lg:w-80 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-all absolute lg:relative z-20 bg-white dark:bg-slate-900 h-full",
        showSidebar ? "left-0" : "-left-full lg:left-0"
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-brand-600" />
            Minhas Conversas
          </h2>
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setShowSidebar(false)}>
            <ArrowLeft size={20} />
          </button>
        </div>
        
        <div className="p-3">
          <button
            onClick={handleCreateNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-brand-600 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg font-medium transition-colors cursor-pointer text-sm"
          >
            <Plus size={16} />
            Nova conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className={cn(
                "w-full text-left p-3.5 border-b border-gray-100 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer",
                activeConvId === conv.id && "bg-brand-50 dark:bg-brand-900/15 border-l-4 border-l-brand-600"
              )}
            >
              <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">{conv.title || 'Atendimento Álvaro AI'}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">{conv.lastMessage || 'Conversa iniciada'}</p>
              <p className="text-[10px] text-gray-400 mt-1.5">{formatRelative(conv.lastMessageTime || conv.updatedAt || conv.createdAt)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative w-full min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-gray-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setShowSidebar(true)}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {activeConv?.title || 'Álvaro AI · Atendimento Inteligente'}
              </h2>
              <p className="text-[11px] text-gray-400">Suporte 24/7 fundamentado na base institucional FECAP</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/aluno/chamados/novo?conversationId=${activeConvId}`)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition-colors cursor-pointer"
              title="Abrir chamado e encaminhar esta conversa para um atendente humano"
            >
              <TicketIcon size={14} />
              Abrir Chamado
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              <Bot size={14} />
              RAG Ativo
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title="Conversas sincronizadas no Cloudflare R2">
              <Cloud size={13} />
              R2 Sincronizado
            </span>
            <button
              onClick={handleExportConversation}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Exportar histórico da conversa sincronizado no Cloudflare R2"
            >
              <Download size={13} />
              Exportar
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {isLoadingConv ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-brand-600 w-8 h-8" />
            </div>
          ) : (
            (messages || []).map((msg: any) => {
              const isUser = msg.role === 'user';
              
              return (
                <div key={msg.id} className={cn("flex max-w-[90%] sm:max-w-[80%]", isUser ? "ml-auto justify-end" : "mr-auto")}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-xs">
                      <Bot size={18} />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className={cn(
                      "p-4 text-sm leading-relaxed shadow-xs",
                      isUser 
                        ? "bg-brand-600 text-white rounded-2xl rounded-tr-xs" 
                        : "bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100 rounded-2xl rounded-tl-xs border border-gray-100 dark:border-slate-700/80"
                    )}>
                      <MarkdownRenderer content={msg.content} isUserMessage={isUser} />
                    </div>

                    {msg.actions && Array.isArray(msg.actions) && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.actions.map((act: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => handleActionClick(act.action)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-colors bg-white dark:bg-slate-800 cursor-pointer shadow-xs"
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="flex max-w-[80%] mr-auto items-center">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0 mr-3 shadow-xs">
                <Bot size={18} />
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl rounded-tl-xs border border-gray-100 dark:border-slate-700 px-4 py-3 flex items-center gap-1.5">
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2.5 hide-scrollbar">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="whitespace-nowrap px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
            
            <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-slate-800/90 rounded-2xl border border-gray-200 dark:border-slate-700 p-2 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600 transition-all">
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl shrink-0">
                <Paperclip size={18} />
              </button>
              
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(inputValue);
                  }
                }}
                placeholder="Pergunte sobre notas, matrículas, bolsas, TCC ou regras institucionais..."
                className="w-full max-h-32 min-h-[44px] bg-transparent border-0 focus:ring-0 resize-none py-2 text-sm text-gray-900 dark:text-white outline-none"
                rows={1}
              />
              
              <button
                onClick={() => handleSend(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                className="p-2.5 bg-brand-600 text-white rounded-xl shrink-0 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              >
                <Send size={16} />
              </button>
            </div>
            
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400">
                Respostas geradas pelo Álvaro AI com base nos regulamentos e manuais da FECAP.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
