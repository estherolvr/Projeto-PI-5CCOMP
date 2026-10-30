import { useState, useEffect } from 'react'
import {
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  History,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface AIReport {
  id: string
  summary: string
  healthScore: number
  diagnostics: string[]
  recommendations: Array<{
    priority: 'alta' | 'media' | 'baixa'
    title: string
    description: string
    impact: string
    category: string
  }>
  metricsSnapshot: any
  createdAt: string
}

export default function AdminAgenteIA() {
  const [currentReport, setCurrentReport] = useState<AIReport | null>(null)
  const [history, setHistory] = useState<AIReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const reports = await api.admin.getAIAnalysisHistory()
      setHistory(reports)
      if (reports.length > 0 && !currentReport) {
        setCurrentReport(reports[0])
        setSelectedHistoryId(reports[0].id)
      }
    } catch (err: any) {
      console.error('Erro ao carregar histórico de IA:', err)
      setError('Falha ao carregar análises prévias de IA.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleRunAnalysis = async () => {
    setGenerating(true)
    setError(null)
    setSuccessNotice(null)

    try {
      const newReport = await api.admin.runAIAnalysis()
      setCurrentReport(newReport)
      setSelectedHistoryId(newReport.id)
      setHistory(prev => [newReport, ...prev.filter(r => r.id !== newReport.id)])
      setSuccessNotice('Novo diagnóstico operacional salvo com sucesso.')
      setTimeout(() => setSuccessNotice(null), 5000)
    } catch (err: any) {
      console.error('Erro ao gerar análise com IA:', err)
      setError(err.message || 'Falha ao processar o diagnóstico.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectReport = (report: AIReport) => {
    setCurrentReport(report)
    setSelectedHistoryId(report.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Inteligência & Diagnósticos com IA
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 border border-brand-200 dark:border-brand-800 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              {currentReport?.metricsSnapshot?.analysisSource === 'gemini' ? 'Google Gemini' : currentReport?.metricsSnapshot?.analysisSource === 'local' ? 'Análise por regras locais' : 'Diagnóstico operacional'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Diagnóstico sob demanda sobre volume de alunos, fila ASA, cumprimento de SLA e gargalos operacionais.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={generating}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analisando Dados Reais...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Gerar Novo Diagnóstico</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {successNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </motion.div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase">Índice Estimado</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {currentReport ? `${currentReport.healthScore}/100` : '--'}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {currentReport ? 'Estimativa do diagnóstico selecionado' : 'Aguardando diagnóstico'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase">Diagnósticos Chave</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {currentReport?.diagnostics.length || 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">Pontos observados nos dados</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase">Ações Recomendadas</span>
            <TrendingUp className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {currentReport?.recommendations.length || 0}
          </p>
          <p className="text-xs text-brand-600 mt-1">Priorizadas por impacto</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase">Relatórios Salvos</span>
            <History className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {history.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Últimos 20 registros</p>
        </div>
      </div>

      {/* Main Analysis Display */}
      {loading ? (
        <div className="p-12 text-center text-sm text-gray-500 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
          Carregando análises de IA...
        </div>
      ) : !currentReport ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
          <Sparkles className="w-12 h-12 text-brand-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Nenhum relatório de IA gerado ainda</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Gere um diagnóstico com os registros atuais de alunos, chamados e SLA. Quando a IA não estiver disponível, a análise usará regras locais e identificará essa origem.
          </p>
          <button
            onClick={handleRunAnalysis}
            disabled={generating}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Executar Primeira Análise
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Executive Summary & Diagnostics (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Executive Summary Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand-50 dark:bg-brand-950/50 rounded-lg text-brand-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-slate-100">
                      Resumo Executivo da Operação
                    </h3>
                    <p className="text-xs text-gray-400">
                      Gerado em {new Date(currentReport.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Saúde:</span>
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold',
                    currentReport.healthScore >= 80
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  )}>
                    {currentReport.healthScore}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-700 text-sm text-gray-800 dark:text-slate-200 leading-relaxed font-normal">
                {currentReport.summary}
              </div>

              {/* Real Snapshot Counters */}
              {currentReport.metricsSnapshot && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-gray-400">Alunos no banco:</span>
                    <p className="font-bold text-gray-900 dark:text-slate-100">{currentReport.metricsSnapshot.totalStudents || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Equipe ASA Ativa:</span>
                    <p className="font-bold text-gray-900 dark:text-slate-100">{currentReport.metricsSnapshot.activeAsa || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Chamados Abertos:</span>
                    <p className="font-bold text-gray-900 dark:text-slate-100">{currentReport.metricsSnapshot.openTickets || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Risco de SLA:</span>
                    <p className="font-bold text-red-600">{currentReport.metricsSnapshot.slaRiskTickets || 0}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Diagnostics List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Constatações Diagnósticas Baseadas em Evidências
              </h3>

              <div className="space-y-2.5">
                {currentReport.diagnostics.map((diag, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-2 shrink-0"></span>
                    <span className="leading-snug">{diag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-600" />
                  Plano de Melhorias Recomendado pela IA
                </h3>
                <span className="text-xs text-gray-400">Ordenado por prioridade</span>
              </div>

              <div className="space-y-4">
                {currentReport.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all bg-white dark:bg-slate-800/80 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider',
                            rec.priority === 'alta'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800'
                              : rec.priority === 'media'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          )}
                        >
                          Prioridade {rec.priority}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                          {rec.category}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">
                      {rec.title}
                    </h4>

                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mb-3">
                      {rec.description}
                    </p>

                    <div className="p-2.5 bg-gray-50 dark:bg-slate-900/60 rounded-lg border border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Impacto Estimado:</span>
                      <span className="font-bold text-brand-700 dark:text-brand-400">{rec.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* History Sidebar (1 Col) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <History className="w-4 h-4 text-gray-500" />
                  Histórico de Análises
                </h3>
                <span className="text-xs text-gray-400">{history.length} salva(s)</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {history.map((rep) => {
                  const isSelected = selectedHistoryId === rep.id

                  return (
                    <button
                      key={rep.id}
                      onClick={() => handleSelectReport(rep)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer block',
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                          : 'border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 dark:text-slate-100">
                          Saúde {rep.healthScore}/100
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(rep.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 line-clamp-2">
                        {rep.summary}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
