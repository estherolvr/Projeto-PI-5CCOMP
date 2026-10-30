import React, { useState, useEffect } from 'react'
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Star,
  User,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'

interface FeedbackItem {
  id: string
  studentId?: string
  studentName: string
  conversationId?: string
  messageId?: string
  type: 'positive' | 'negative'
  snippet: string
  comment?: string
  rating?: number
  createdAt: string
}

export default function AdminFeedback() {
  const { data: feedbackData, loading, error, refresh: loadFeedback } = useAdminQuery(api.admin.getFeedback)
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all')
  const [searchTerm, setSearchTerm] = useState('')



  const filteredList = (feedbackData?.feedbacks || []).filter((item) => {
    const matchesType = filter === 'all' || item.type === filter
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.comment && item.comment.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesType && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Feedback da Inteligência Artificial
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Avaliações Reais dos Alunos
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Métricas de satisfação e comentários coletados diretamente das respostas do Álvaro AI no chat.
          </p>
        </div>

        <button
          onClick={loadFeedback}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-brand-600')} />
          {loading ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadFeedback} className="underline font-semibold ml-4">Tentar novamente</button>
        </div>
      )}

      {/* KPI Cards (Real Data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full mb-2">
            <ThumbsUp className="w-8 h-8" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            {feedbackData ? `${feedbackData.positiveRate}%` : '--'}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-1">Feedback Positivo</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {feedbackData ? `${feedbackData.positiveCount} avaliações positivas` : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full mb-2">
            <ThumbsDown className="w-8 h-8" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            {feedbackData ? `${feedbackData.negativeRate}%` : '--'}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-1">Feedback Negativo</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
            {feedbackData ? `${feedbackData.negativeCount} apontamentos de melhoria` : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full mb-2">
            <MessageSquare className="w-8 h-8" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            {feedbackData ? feedbackData.totalCount : '--'}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-1">Total de Avaliações Registradas</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            Persistidas na base SQLite
          </p>
        </div>
      </div>

      {/* Feedback List Container */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                filter === 'all'
                  ? 'bg-gray-900 text-white dark:bg-slate-700 dark:text-slate-100'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              Todos ({feedbackData?.totalCount || 0})
            </button>
            <button
              onClick={() => setFilter('positive')}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5',
                filter === 'positive'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Positivos ({feedbackData?.positiveCount || 0})
            </button>
            <button
              onClick={() => setFilter('negative')}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5',
                filter === 'negative'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Negativos ({feedbackData?.negativeCount || 0})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por aluno ou trecho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            Carregando avaliações reais dos alunos...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              Nenhuma avaliação encontrada
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Quando os alunos avaliarem as mensagens do assistente no chat, os registros aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="p-6 hover:bg-gray-50/70 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-2.5 rounded-full mt-0.5 shrink-0',
                      item.type === 'positive'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                    )}
                  >
                    {item.type === 'positive' ? (
                      <ThumbsUp className="w-5 h-5" />
                    ) : (
                      <ThumbsDown className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-slate-100">
                          {item.studentName}
                        </h4>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            item.type === 'positive'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:border-red-800'
                          )}
                        >
                          {item.type === 'positive' ? 'Útil' : 'Precisa Melhorar'}
                        </span>
                      </div>

                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-900/80 rounded-lg p-3 mb-2 border border-gray-100 dark:border-slate-800 text-xs">
                      <span className="text-gray-400 font-medium block mb-1">
                        Interação / Pergunta do Aluno:
                      </span>
                      <p className="text-gray-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed">
                        "{item.snippet}"
                      </p>
                    </div>

                    {item.comment && (
                      <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-lg border-l-4 border-blue-500 text-xs text-gray-800 dark:text-slate-200 italic">
                        "{item.comment}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
