import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Zap, TrendingUp, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { mockTickets } from '@/lib/mock-data';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AsaAgenteIA() {
  const data = [
    { name: 'Seg', conver: 120, resolvidas: 85 },
    { name: 'Ter', conver: 150, resolvidas: 110 },
    { name: 'Qua', conver: 180, resolvidas: 140 },
    { name: 'Qui', conver: 130, resolvidas: 90 },
    { name: 'Sex', conver: 170, resolvidas: 125 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-brand-600" /> Desempenho do Agente IA
          </h1>
          <p className="text-gray-500 text-sm mt-1">Monitoramento em tempo real da assistência automatizada.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-900/50">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Operacional
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Conversas Hoje', value: '342', icon: Activity, color: 'text-blue-500' },
          { label: 'Taxa de Resolução', value: '74%', icon: CheckCircle2, color: 'text-brand-500' },
          { label: 'Tempo Médio', value: '45s', icon: Zap, color: 'text-amber-500' },
          { label: 'Transbordos', value: '89', icon: TrendingUp, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{stat.value}</p>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-6">Eficiência na Semana</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="conver" stroke="#94a3b8" fillOpacity={0.1} fill="#94a3b8" name="Total Interações" />
                <Area type="monotone" dataKey="resolvidas" stroke="#16a34a" fillOpacity={0.3} fill="#16a34a" name="Resolvidas IA" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4 flex items-center justify-between">
            Insights Pendentes de Aprovação
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">3 novos</span>
          </h2>
          <div className="space-y-4">
            {mockTickets.filter(t => t.aiSuggestion).slice(0, 3).map(ticket => (
              <div key={ticket.id} className="p-4 rounded-lg border border-brand-100 dark:border-slate-700 bg-brand-50/30 dark:bg-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-gray-500">#{ticket.number}</span>
                  <span className="text-xs font-medium text-brand-600 bg-brand-100 px-2 py-0.5 rounded">{Math.round(ticket.aiSuggestion!.confidence * 100)}% de confiança</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-1">{ticket.aiSuggestion!.intent}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">{ticket.aiSuggestion!.recommendation}</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors">Aprovar Macro</button>
                  <button className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">Descartar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
