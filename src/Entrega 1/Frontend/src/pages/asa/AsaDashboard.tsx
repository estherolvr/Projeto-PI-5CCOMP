import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Ticket, AlertCircle, Clock, CheckCircle, ArrowUpRight, MessageSquare, Calendar } from 'lucide-react';
import { mockTickets } from '@/lib/mock-data';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/app-store';

const mockChartData = {
  ticketsOverTime: [
    { date: '01/08', abertos: 12, resolvidos: 10 },
    { date: '08/08', abertos: 15, resolvidos: 14 },
    { date: '15/08', abertos: 18, resolvidos: 16 },
    { date: '22/08', abertos: 22, resolvidos: 20 },
    { date: '29/08', abertos: 14, resolvidos: 18 },
  ]
};

export default function AsaDashboard() {
  const currentUser = useAppStore(state => state.currentUser);
  const attendantId = currentUser?.id || 'asa-01';
  const riskTickets = mockTickets.filter(t => t.slaStatus === 'risk');
  const recentTickets = mockTickets.slice(0, 5);
  const myTickets = mockTickets.filter(t => t.assignedTo === attendantId);

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Atendente';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Bom dia, {firstName} 👋</h1>
        <p className="text-gray-500 dark:text-slate-400">Veja o que precisa da sua atenção.</p>
      </header>

      {/* Metrics */}
      <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 snap-x">
        {[
          { label: 'Chamados abertos', value: 7, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Em atendimento', value: 4, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Aguardando aluno', value: 2, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          { label: 'Resolvidos hoje', value: 6, icon: CheckCircle, color: 'text-brand-600', bg: 'bg-brand-100 dark:bg-brand-900/30' },
        ].map((stat, i) => (
          <div key={i} className="min-w-[240px] md:min-w-0 snap-start bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Volume de Chamados (Agosto)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData.ticketsOverTime}>
                  <defs>
                    <linearGradient id="colorAbertos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResolvidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="abertos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAbertos)" />
                  <Area type="monotone" dataKey="resolvidos" stroke="#16a34a" fillOpacity={1} fill="url(#colorResolvidos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
             <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Atividade recente</h2>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-900/50 dark:text-slate-400">
                   <tr>
                     <th className="px-4 py-3 rounded-tl-lg">ID</th>
                     <th className="px-4 py-3">Aluno</th>
                     <th className="px-4 py-3">Status</th>
                     <th className="px-4 py-3">Prioridade</th>
                     <th className="px-4 py-3">Responsável</th>
                     <th className="px-4 py-3 rounded-tr-lg">Atualização</th>
                   </tr>
                 </thead>
                 <tbody>
                   {recentTickets.map(t => (
                     <tr key={t.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                       <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">#{t.number}</td>
                       <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{t.studentId}</td>
                       <td className="px-4 py-3">
                         <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{t.status.replace('_', ' ')}</span>
                       </td>
                       <td className="px-4 py-3">
                         <span className={`px-2 py-1 text-xs rounded-full ${t.priority === 'alta' || t.priority === 'critica' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'}`}>{t.priority}</span>
                       </td>
                       <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{t.assignedTo || 'N/A'}</td>
                       <td className="px-4 py-3 text-gray-500">{new Date(t.updatedAt).toLocaleDateString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* SLA Alert */}
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
            <div className="flex items-center space-x-2 mb-4 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Atenção necessária</h2>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4">{riskTickets.length} chamados com SLA em risco</p>
            <div className="space-y-3">
              {riskTickets.slice(0, 2).map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-red-100 dark:border-red-800/30 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400">#{t.number}</span>
                    <span className="text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Vence em breve
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 line-clamp-1">{t.title}</p>
                  <Link to={`/asa/chamados/${t.id}`} className="mt-2 text-xs text-center font-medium bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-md transition-colors">
                    Atender
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Presencial Schedule Card */}
          <div className="bg-brand-50/60 dark:bg-brand-950/20 p-5 rounded-xl border border-brand-200 dark:border-brand-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 font-bold text-sm">
                <Calendar className="w-4 h-4" />
                <span>Atendimentos Presenciais</span>
              </div>
              <span className="text-2xs bg-brand-600 text-white font-bold px-2 py-0.5 rounded-full">Campus</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400">
              Escala de guichês no Campus Liberdade e sincronização externa com Google Agenda.
            </p>
            <Link
              to="/asa/agendamentos"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              Abrir Calendário ASA
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* My Tickets */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Meus Chamados</h2>
            <div className="space-y-2">
              {myTickets.map(t => (
                <Link to={`/asa/chamados/${t.id}`} key={t.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-600 cursor-pointer">
                  <div className="truncate pr-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">#{t.number}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{t.title}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
