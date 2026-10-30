import React from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquare, Clock } from 'lucide-react';
import { mockConversations, mockStudents } from '@/lib/mock-data';

export default function AsaConversas() {
  const [activeConv, setActiveConv] = React.useState(mockConversations[0]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* List */}
      <div className="w-[350px] border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Conversas Bot</h1>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar conversa..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockConversations.map(conv => {
            const student = mockStudents.find(s => s.id === conv.studentId);
            return (
              <div 
                key={conv.id} 
                onClick={() => setActiveConv(conv)}
                className={`p-4 border-b border-gray-100 dark:border-slate-700 cursor-pointer transition-colors ${activeConv.id === conv.id ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-gray-900 dark:text-slate-100 text-sm truncate pr-2">{student?.name || 'Aluno'}</h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(conv.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1 truncate">{conv.title}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{conv.lastMessage}</p>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* View */}
      <div className="flex-1 bg-gray-50 dark:bg-slate-900 flex flex-col">
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">{activeConv.title}</h2>
            <p className="text-sm text-gray-500">Histórico de interação com o Agente Virtual</p>
          </div>
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700">
            Assumir atendimento
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeConv.messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="text-xs text-gray-500 mb-1">{msg.role === 'user' ? 'Aluno' : 'Álvaro AI'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-gray-800 text-white rounded-tr-none dark:bg-slate-700' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.actions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.actions.map(action => (
                      <span key={action.label} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-900 text-brand-600 dark:text-brand-400 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors">
                        {action.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
