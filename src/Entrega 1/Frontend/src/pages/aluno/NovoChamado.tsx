import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UploadCloud, CheckCircle2, MessageSquare, Bot, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

export default function NovoChamado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversationId');

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<any>(null);
  const [linkedConversation, setLinkedConversation] = useState<any>(null);
  const [showChatPreview, setShowChatPreview] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const categories = ['Matrícula', 'Financeiro', 'Acadêmico', 'Documentos', 'Infraestrutura', 'Outros'];

  // Load linked conversation if opened from chat
  useEffect(() => {
    if (conversationId) {
      api.chat.getConversation(conversationId).then(conv => {
        if (conv) {
          setLinkedConversation(conv);
          // Auto-prefill title if empty
          if (!title && conv.title && conv.title !== 'Nova conversa') {
            setTitle(conv.title);
          }
          // Auto-prefill description with student's questions from the chat
          if (!description && conv.messages && conv.messages.length > 0) {
            const userMessages = conv.messages.filter((m: any) => m.role === 'user');
            if (userMessages.length > 0) {
              const lastUserMsg = userMessages[userMessages.length - 1].content;
              setDescription(lastUserMsg);
            }
          }
        }
      }).catch(err => console.error('Erro ao buscar conversa vinculada:', err));
    }
  }, [conversationId]);

  const handleNext = () => {
    if (step === 1 && title && category && description) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const ticket = await api.tickets.create({
        title,
        description,
        category: category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        conversationId: conversationId || undefined,
      });
      setCreatedTicket(ticket);
      setStep(3);
    } catch (err) {
      console.error('Erro ao criar chamado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      {step < 3 && (
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Abrir Novo Chamado</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Descreva sua solicitação para a equipe do ASA.</p>
          </div>
        </div>
      )}

      {/* Stepper Indicator */}
      {step < 3 && (
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center w-full max-w-sm">
            <div className={cn("flex-1 h-1.5 rounded-full", step >= 1 ? "bg-brand-600" : "bg-gray-200 dark:bg-slate-700")} />
            <div className={cn("flex-1 h-1.5 rounded-full ml-2", step >= 2 ? "bg-brand-600" : "bg-gray-200 dark:bg-slate-700")} />
          </div>
        </div>
      )}

      {/* Linked Conversation Banner */}
      {linkedConversation && step < 3 && (
        <div className="bg-brand-50/80 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/60 rounded-xl p-4 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand-600" />
                  Chamado Vinculado ao Chat com IA
                </h4>
                <p className="text-[11px] text-brand-700 dark:text-brand-300/80">
                  O atendente do ASA poderá ver o histórico prévio da sua conversa com a IA.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowChatPreview(!showChatPreview)}
              className="px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              {showChatPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showChatPreview ? 'Ocultar' : 'Ver histórico'}
            </button>
          </div>

          {showChatPreview && linkedConversation.messages && (
            <div className="mt-3 pt-3 border-t border-brand-200/60 dark:border-brand-800/40 max-h-48 overflow-y-auto space-y-2 pr-1">
              {linkedConversation.messages.map((m: any) => (
                <div
                  key={m.id}
                  className={cn(
                    "p-2.5 rounded-lg text-xs",
                    m.role === 'user'
                      ? "bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 ml-4 font-medium text-gray-800 dark:text-slate-200"
                      : "bg-brand-100/50 dark:bg-brand-950/40 mr-4 text-gray-700 dark:text-slate-300"
                  )}
                >
                  <span className="font-bold text-[10px] uppercase block mb-0.5 text-gray-400">
                    {m.role === 'user' ? 'Você' : 'Álvaro AI'}
                  </span>
                  <div className="line-clamp-3">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: Form */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Assunto</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Dúvida sobre aproveitamento de estudos"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-600 focus:border-brand-600 dark:bg-slate-900 dark:text-white outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-600 focus:border-brand-600 dark:bg-slate-900 dark:text-white outline-none transition-all text-sm"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Descrição Detalhada</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Detalhe o máximo possível a sua solicitação..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-600 focus:border-brand-600 dark:bg-slate-900 dark:text-white outline-none transition-all resize-y text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Anexos (opcional)</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                <UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Clique ou arraste arquivos aqui</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG até 10MB</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleNext}
                disabled={!title || !category || !description}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer text-sm shadow-xs"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Preview */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-300 p-4 rounded-xl text-sm border border-brand-200 dark:border-brand-800/50">
              Confira os dados do seu chamado antes de confirmar o envio para a equipe ASA.
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                <span className="inline-block mt-2 px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                  {category}
                </span>
                {linkedConversation && (
                  <span className="inline-flex items-center gap-1 ml-2 px-2.5 py-1 rounded text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    <MessageSquare size={12} /> Chat IA Vinculado
                  </span>
                )}
              </div>
              
              <div className="border-t border-gray-100 dark:border-slate-700 pt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Descrição do Chamado</h4>
                <p className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">{description}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer text-sm"
              >
                Voltar e editar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={cn(
                  "px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors cursor-pointer text-sm shadow-xs",
                  isLoading && "opacity-80 cursor-not-allowed"
                )}
              >
                {isLoading ? 'Enviando...' : 'Confirmar e abrir chamado'}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <CheckCircle2 size={72} className="text-brand-500 mb-6" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chamado aberto com sucesso!</h2>
            <p className="text-base text-gray-500 dark:text-slate-400 mb-6">
              Protocolo número <strong className="text-gray-900 dark:text-white font-mono">#{createdTicket?.number || '1058'}</strong>
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/aluno/chamados')}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer text-sm"
              >
                Ver todos meus chamados
              </button>
              <button
                onClick={() => navigate(`/aluno/chamados/${createdTicket?.id || 'ticket-01'}`)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors cursor-pointer text-sm shadow-xs"
              >
                Acompanhar chamado
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
