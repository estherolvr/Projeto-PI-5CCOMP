import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Tag, Paperclip, Send, Bot, AlertCircle } from 'lucide-react';
import { formatDateTime, cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/app-store';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';

const statusConfig: Record<string, { label: string; className: string }> = {
  aberto: { label: 'Aberto', className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  em_atendimento: { label: 'Em atendimento', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  aguardando_aluno: { label: 'Aguardando sua resposta', className: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
  resolvido: { label: 'Resolvido', className: 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' },
  fechado: { label: 'Fechado', className: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400' },
};

export default function DetalheChamadoAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const fetchTicket = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await api.tickets.get(id);
      setTicket(data);
      setMessages((data as any).messages || []);
    } catch (err: any) {
      console.error('Erro ao carregar chamado:', err);
      setError('Não foi possível carregar os dados do chamado.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return;
    setIsSending(true);

    try {
      const createdMsg = await api.tickets.addMessage(ticket.id, {
        content: newMessage.trim(),
      });
      setMessages(prev => [...prev, createdMsg]);
      setNewMessage('');
      // Refetch ticket in case status changed
      const updatedTicket = await api.tickets.get(ticket.id);
      setTicket(updatedTicket);
    } catch (err) {
      console.error('Erro ao enviar resposta:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="animate-spin w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500 dark:text-slate-400">Carregando detalhes do chamado...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chamado não encontrado</h2>
        <p className="text-gray-500 dark:text-slate-400">{error || 'O chamado solicitado não existe ou foi removido.'}</p>
        <button
          onClick={() => navigate('/aluno/chamados')}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium"
        >
          Voltar para meus chamados
        </button>
      </div>
    );
  }

  const currentStatus = statusConfig[ticket.status] || statusConfig['aberto'];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/aluno/chamados')}
          className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">#{ticket.number}</span>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", currentStatus.className)}>
              {currentStatus.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{ticket.title}</h1>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 flex flex-wrap gap-y-4 gap-x-8">
        <div className="space-y-1">
          <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Tag size={14}/> Categoria</span>
          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{ticket.category}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Clock size={14}/> Criado em</span>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(ticket.createdAt)}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><User size={14}/> Atendente</span>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {ticket.attendant?.name ? ticket.attendant.name : 'Equipe ASA (Aguardando triagem)'}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Clock size={14}/> Previsão SLA</span>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(ticket.slaDeadline)}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Mensagens</h2>
        
        <div className="space-y-6">
          {messages.map((msg: any) => {
            const isStudent = msg.senderRole === 'aluno';
            const isAI = msg.senderRole === 'sistema' || msg.senderRole === 'ia';
            const isASA = msg.senderRole === 'asa' || msg.senderRole === 'admin';

            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 p-5 rounded-xl border",
                  isAI ? "bg-brand-50/50 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/20" :
                  isStudent ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 ml-4 sm:ml-12" :
                  "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 mr-4 sm:mr-12"
                )}
              >
                <div className="shrink-0 mt-1">
                  {isAI ? (
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                      <Bot size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center font-medium text-sm">
                      {(msg.senderName || 'U').charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      {msg.senderName}
                      {isAI && <span className="text-[10px] uppercase tracking-wider text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded">IA</span>}
                      {isASA && <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold bg-blue-100 px-1.5 py-0.5 rounded">ASA</span>}
                    </span>
                    <span className="text-xs text-gray-500">{formatDateTime(msg.createdAt || msg.timestamp)}</span>
                  </div>
                  <MarkdownRenderer content={msg.content} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Message Input */}
      {ticket.status !== 'fechado' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sticky bottom-4 shadow-lg shadow-gray-200/20 dark:shadow-none">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escreva sua resposta ou dúvida para o atendente..."
            className="w-full bg-transparent border-0 focus:ring-0 resize-none py-2 text-gray-900 dark:text-white outline-none min-h-[80px]"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg">
              <Paperclip size={20} />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Send size={16} />
              {isSending ? 'Enviando...' : 'Enviar Resposta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
