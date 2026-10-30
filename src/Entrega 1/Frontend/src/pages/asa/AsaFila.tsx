import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, X, Clock, RefreshCw, AlertTriangle, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatRelative } from '../../lib/utils';
import { useAppStore } from '../../store/app-store';

export default function AsaFila() {
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);

  const [tickets, setTickets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const data = await api.metrics.queue();
      setTickets(data);
    } catch (err) {
      console.error('Erro ao carregar fila:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAssignToMe = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    try {
      await api.tickets.update(ticketId, {
        assignedTo: currentUser?.id || 'asa-01',
        status: 'em_atendimento',
      });
      fetchQueue();
    } catch (err) {
      console.error('Erro ao assumir chamado:', err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = selectedStatus === 'todos' || t.status === selectedStatus || (selectedStatus === 'risk' && t.isSlaRisk);
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      t.title.toLowerCase().includes(q) ||
      t.number.toString().includes(q) ||
      (t.student?.name && t.student.name.toLowerCase().includes(q)) ||
      (t.student?.ra && t.student.ra.includes(q)) ||
      t.category.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const totalCount = tickets.length;
  const abertosCount = tickets.filter(t => t.status === 'aberto').length;
  const emAtendimentoCount = tickets.filter(t => t.status === 'em_atendimento').length;
  const slaRiskCount = tickets.filter(t => t.isSlaRisk || t.isSlaBreached).length;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'aberto': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      case 'em_atendimento': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      case 'aguardando_aluno': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
      case 'resolvido': return 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 border border-brand-200 dark:border-brand-800';
      default: return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch(priority) {
      case 'critica': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'alta': return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
      case 'media': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      default: return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Fila de Atendimento ASA</h1>
            <button
              onClick={fetchQueue}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Atualizar fila"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin text-brand-600" : ""} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-slate-400">
            <span>Total na fila: <strong className="text-gray-900 dark:text-white">{totalCount}</strong></span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>Abertos: <strong className="text-blue-600">{abertosCount}</strong></span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>Em atendimento: <strong className="text-amber-600">{emAtendimentoCount}</strong></span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="text-red-500 font-medium flex items-center gap-1">
              <AlertTriangle size={14} /> SLA em risco: <strong>{slaRiskCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar por número (#1058), aluno, RA ou assunto..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'aberto', label: 'Abertos' },
              { id: 'em_atendimento', label: 'Em atendimento' },
              { id: 'aguardando_aluno', label: 'Aguardando Aluno' },
              { id: 'risk', label: '⚠️ SLA em Risco' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedStatus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedStatus === f.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3"># Protocolo</th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Assunto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">SLA Restante</th>
                <th className="px-4 py-3">Abertura</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {filteredTickets.map((ticket: any) => {
                const isMine = ticket.attendant?.id === currentUser?.id;
                const slaMinutes = ticket.slaRemainingMinutes;
                const isOverdue = slaMinutes <= 0;

                return (
                  <tr 
                    key={ticket.id} 
                    onClick={() => navigate(`/asa/chamados/${ticket.id}`)}
                    className="hover:bg-gray-50/80 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-white">
                      #{ticket.number}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {ticket.student?.name || 'Aluno'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                        RA: {ticket.student?.ra || '24000000'} · {ticket.student?.course || 'Graduação'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate">
                      <span className="font-medium text-gray-900 dark:text-slate-100">{ticket.title}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getPriorityStyle(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {ticket.attendant ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                            {ticket.attendant.name.charAt(0)}
                          </div>
                          <span className={`text-xs ${isMine ? "font-bold text-brand-600 dark:text-brand-400" : "text-gray-600 dark:text-slate-300"}`}>
                            {ticket.attendant.name} {isMine && "(Você)"}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleAssignToMe(e, ticket.id)}
                          className="px-2.5 py-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-300 rounded font-medium transition-colors flex items-center gap-1"
                        >
                          <UserCheck size={12} /> Assumir
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className={`text-xs font-semibold flex items-center gap-1 ${
                        isOverdue ? 'text-red-600 dark:text-red-400' :
                        ticket.isSlaRisk ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <Clock size={13} />
                        {isOverdue ? 'SLA Estourado' :
                         slaMinutes < 60 ? `${slaMinutes}m restantes` :
                         `${Math.floor(slaMinutes / 60)}h ${slaMinutes % 60}m`}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-slate-400">
                      {formatRelative(ticket.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
                        Atender &rarr;
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredTickets.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500 dark:text-slate-400">
                    Nenhum chamado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
