import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Plus, ArrowLeft, Bot, Book, Sparkles, MessageSquare, Loader2, Ticket as TicketIcon, Cloud, Download, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { formatRelative, cn } from '../../lib/utils';
import { api } from '../../lib/api';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';

export default function AlunoChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeConversationId } = useParams();
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q');
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState(initialQuery || '');
  const [isLoadingConv, setIsLoadingConv] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setEvaluatedMessages(prev => {const next={...prev};delete next[msg.id];return next});
      setLoadError(e instanceof Error ? e.message : 'Não foi possível registrar a avaliação.');
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversation = async (convId: string) => {
    setIsLoadingConv(true); setLoadError(null); setActiveConvId(''); setMessages([]); setSelectedFiles([]);
    try { const conv = await api.chat.getConversation(convId); setActiveConvId(conv.id); setMessages(conv.messages || []); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar a conversa.'); }
    finally { setIsLoadingConv(false); }
  };
  const fetchConversations = async () => {
    setIsLoadingConv(true); setLoadError(null);
    try {
      const list = await api.chat.getConversations(); setConversations(list);
      const selected = routeConversationId || list[0]?.id;
      if (selected) await loadConversation(selected);
      else { setMessages([]); setActiveConvId(''); }
    } catch (error) { setConversations([]); setMessages([]); setActiveConvId(''); setLoadError(error instanceof Error ? error.message : 'Não foi possível listar as conversas.'); }
    finally { setIsLoadingConv(false); }
  };
  useEffect(() => { void fetchConversations(); }, [routeConversationId]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialQuery && activeConvId && !isLoadingConv) {
      setSearchParams({}, { replace: true });
      handleSend(initialQuery);
    }
  }, [initialQuery, activeConvId, isLoadingConv]);

  const handleCreateNewConversation = async () => {
    if (isTyping) return;
    try {
      setIsLoadingConv(true); setLoadError(null); setSelectedFiles([]);
      const newConv = await api.chat.createConversation('Nova Conversa com Álvaro AI');
      const updatedList = [newConv, ...conversations];
      setConversations(updatedList);

      setActiveConvId(newConv.id);
      setMessages(newConv.messages || []);

      setShowSidebar(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Não foi possível iniciar uma conversa.');
    } finally {
      setIsLoadingConv(false);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    if (isTyping) return;
    setShowSidebar(false);
    await loadConversation(convId);
  };

  const handleSend = async (text: string) => {
    if ((!text.trim() && !selectedFiles.length) || isTyping || isLoadingConv) return;
    if (!activeConvId) { setLoadError('Inicie uma conversa antes de enviar sua mensagem.'); return; }
    setLoadError(null);
    const outgoingText = text.trim() || 'Analise os arquivos anexados.';
    const outgoingFiles = [...selectedFiles];

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: outgoingText,
      attachments: outgoingFiles.map((file, index) => ({ id: `pending-${index}`, name: file.name, size: file.size })),
      timestamp: new Date().toISOString()
    };

    const updatedWithUser = [...(messages || []), tempUserMsg];
    setMessages(updatedWithUser);

    setInputValue('');
    setIsTyping(true);

    try {
      const response = await api.chat.sendMessage(activeConvId, outgoingText, outgoingFiles);
      if (!response?.aiMessage || !response?.userMessage) throw new Error('A resposta do chat está incompleta. Atualize a conversa antes de reenviar.');
      if (response?.aiMessage) {
        const updatedWithAi = [...updatedWithUser.filter(m => m.id !== tempUserMsg.id), response.userMessage, response.aiMessage];
        setMessages(updatedWithAi);
        setSelectedFiles([]);

        // Refresh conversation list preview
        api.chat.getConversations().then(res => {
          if (res?.length) {
            setConversations(res);

          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setMessages(updatedWithUser.filter(m => m.id !== tempUserMsg.id));
      setInputValue(text);
      setLoadError(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...selectedFiles, ...Array.from(files)];
    if (next.length > 3 || next.some(file => file.size > 5 * 1024 * 1024) || next.reduce((size, file) => size + file.size, 0) > 10 * 1024 * 1024) {
      setLoadError('Envie até 3 arquivos, com até 5 MB cada e 10 MB no total.'); return;
    }
    if (next.some(file => !/\.(pdf|txt|md)$/i.test(file.name) || !file.size)) {
      setLoadError('Envie arquivos PDF, TXT ou Markdown (.md) que não estejam vazios.'); return;
    }
    setSelectedFiles(next); setLoadError(null);
  };

  const handleDownloadAttachment = async (messageId: string, attachment: any) => {
    setDownloading(attachment.id);
    try { await api.chat.downloadAttachment(activeConvId, messageId, attachment.id, attachment.name); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Não foi possível baixar o anexo.'); }
    finally { setDownloading(null); }
  };

  const handleExportConversation = () => {
    if (!messages || messages.length === 0) return;
    const activeConv = conversations.find(c => c.id === activeConvId);
    const exportData = {
      title: activeConv?.title || 'Conversa Álvaro AI',
      conversationId: activeConvId,
      exportedAt: new Date().toISOString(),
      source: 'Histórico consultado na API',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        attachments: m.attachments || [],
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
            disabled={isTyping || isLoadingConv}
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
              disabled={isTyping}
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
              <p className="text-[11px] text-gray-400">Orientações com base nos documentos disponíveis</p>
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
            <button
              onClick={handleExportConversation}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Exportar histórico carregado da conversa"
            >
              <Download size={13} />
              Exportar
            </button>
          </div>
        </div>

        {loadError && <div role="alert" className="p-3 text-sm bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"><p>{loadError}</p><button onClick={()=>void fetchConversations()} className="underline mt-2">Tentar novamente</button></div>}
        {!isLoadingConv && !loadError && !activeConvId && <div className="p-6 text-center text-gray-500"><p>Nenhuma conversa registrada.</p><button onClick={()=>void handleCreateNewConversation()} className="mt-3 text-brand-600 underline">Iniciar conversa</button></div>}
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

                    {msg.attachments?.length > 0 && <div className="flex flex-wrap gap-2">
                      {msg.attachments.map((file: any) => <button key={file.id} type="button"
                        disabled={msg.id.startsWith('temp-') || downloading === file.id}
                        onClick={() => void handleDownloadAttachment(msg.id, file)}
                        aria-label={`Baixar anexo ${file.name}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-brand-700 dark:text-brand-300 disabled:opacity-50">
                        <Download size={14}/><span className="break-all">{file.name}</span><span>{Math.ceil(file.size / 1024)} KB</span>
                      </button>)}
                    </div>}

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
            {selectedFiles.length > 0 && <div className="flex flex-wrap gap-2 pb-2" aria-label="Anexos selecionados">
              {selectedFiles.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 px-3 py-2 text-xs text-brand-700 dark:text-brand-300">
                <Paperclip size={14}/><span className="break-all">{file.name}</span>
                <button type="button" aria-label={`Remover ${file.name}`} disabled={isTyping} onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}><X size={14}/></button>
              </span>)}
            </div>}
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
              <input ref={fileInputRef} type="file" hidden multiple accept=".pdf,.txt,.md" aria-label="Arquivos do chat"
                onChange={event => { handleFiles(event.target.files); event.target.value = ''; }}/>
              <button type="button" aria-label="Anexar arquivo ao chat" title="Anexar PDF, TXT ou MD (até 3 arquivos, 5 MB cada, 10 MB no total)"
                disabled={!activeConvId || isLoadingConv || isTyping} onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl shrink-0 disabled:opacity-50">
                <Paperclip size={18} />
              </button>
              
              <textarea
                disabled={!activeConvId || isLoadingConv}
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
                aria-label="Enviar mensagem"
                disabled={(!inputValue.trim() && !selectedFiles.length) || isTyping || isLoadingConv || !activeConvId}
                className="p-2.5 bg-brand-600 text-white rounded-xl shrink-0 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              >
                <Send size={16} />
              </button>
            </div>
            
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-400">
                Anexos: PDF com texto selecionável, TXT ou MD · até 3 arquivos, 5 MB cada e 10 MB no total.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
