import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  MessageSquare,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Calendar,
  ShieldCheck,
  UserCheck
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'

interface DashboardStats {
  totalStudents: number
  totalAsa: number
  activeAsa: number
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  slaRiskTickets: number
  appointmentsCount: number
  pieData: { name: string; value: number; color: string }[]
  chartData: { name: string; abertos: number; resolvidos: number }[]
  teamStatus: { id: string; name: string; email: string; avatar: string; status: string; lastAccess: string; tickets: number }[]
  recentAuditEvents: { id: string; userName: string; action: string; createdAt: string; details?: string; severity: string }[]
  systemHealth: { label: string; status: string; color: string }[]
}

export default function AdminCommandCenter() {
  const { data: stats, loading, error, refresh } = useAdminQuery<DashboardStats>(api.admin.getDashboardStats)
  const [refreshing, setRefreshing] = useState(false)
  const loadData = async (_manual = false) => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-6 h-80 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700"></div>
          <div className="lg:col-span-4 h-80 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700"></div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Falha ao carregar indicadores reais</h3>
        <p className="text-sm text-red-600 dark:text-red-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => loadData(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    )
  }

  const resolutionRate = stats.totalTickets > 0
    ? Number(((stats.resolvedTickets / stats.totalTickets) * 100).toFixed(1))
    : 0

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Central de Controle</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Atualização a cada 30 s
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Serviços configurados, alunos cadastrados e operação da equipe ASA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin text-brand-600')} />
            {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
          
          <Link
            to="/admin/agente-ia"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Análise com IA
          </Link>
        </div>
      </div>

      {/* Health Badges */}
      <div className="flex flex-wrap gap-2">
        {stats.systemHealth.map((service) => (
          <div
            key={service.label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm text-xs font-medium text-gray-600 dark:text-slate-300"
          >
            <span className={cn('w-2 h-2 rounded-full', service.color)}></span>
            {service.label} <span className="opacity-70 font-normal">● {service.status}</span>
          </div>
        ))}
      </div>

      {/* Attention / Alerts Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 transition-colors',
          stats.slaRiskTickets > 0
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
            : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
        )}
      >
        <div className={cn(
          'p-2 rounded-lg shrink-0',
          stats.slaRiskTickets > 0
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-500'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
        )}>
          {stats.slaRiskTickets > 0 ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <h3 className={cn(
            'text-sm font-semibold',
            stats.slaRiskTickets > 0
              ? 'text-amber-800 dark:text-amber-400'
              : 'text-emerald-800 dark:text-emerald-400'
          )}>
            {stats.slaRiskTickets > 0 ? 'Atenção Operacional Requerida' : 'Nenhum chamado com SLA em risco'}
          </h3>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700 dark:text-slate-300">
            <Link to="/admin/sla" className="flex items-center gap-1 hover:underline font-medium">
              <span className={cn('w-1.5 h-1.5 rounded-full', stats.slaRiskTickets > 0 ? 'bg-amber-500' : 'bg-emerald-500')}></span>
              {stats.slaRiskTickets} chamado(s) com SLA em risco
            </Link>
            <Link to="/admin/fila" className="flex items-center gap-1 hover:underline font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {stats.openTickets} chamado(s) aguardando resolução
            </Link>
            <Link to="/admin/alunos" className="flex items-center gap-1 hover:underline font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {stats.totalStudents} alunos cadastrados
            </Link>
            <Link to="/admin/asa" className="flex items-center gap-1 hover:underline font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {stats.activeAsa} de {stats.totalAsa} contas ASA ativas
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Primary KPI Cards (Real Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: 'Alunos Cadastrados',
            value: stats.totalStudents,
            icon: Users,
            subtext: 'Cadastros do sistema',
            color: 'text-blue-600',
            link: '/admin/alunos'
          },
          {
            label: 'Equipe ASA',
            value: stats.totalAsa,
            icon: UserCheck,
            subtext: `${stats.activeAsa} contas ativas`,
            color: 'text-brand-600',
            link: '/admin/asa'
          },
          {
            label: 'Chamados em Aberto',
            value: stats.openTickets,
            icon: Ticket,
            subtext: 'Aguardando resolução',
            color: 'text-amber-600',
            link: '/admin/fila'
          },
          {
            label: 'Chamados Resolvidos',
            value: stats.resolvedTickets,
            icon: CheckCircle2,
            subtext: `${resolutionRate}% taxa de resolução`,
            color: 'text-emerald-600',
            link: '/admin/chamados'
          },
          {
            label: 'Agendamentos ASA',
            value: stats.appointmentsCount,
            icon: Calendar,
            subtext: 'Presenciais no campus',
            color: 'text-purple-600',
            link: '/admin/agendamentos'
          },
          {
            label: 'SLA em Risco / Estouro',
            value: stats.slaRiskTickets,
            icon: AlertTriangle,
            subtext: stats.slaRiskTickets > 0 ? 'Demanda atenção' : 'Dentro do prazo',
            color: stats.slaRiskTickets > 0 ? 'text-red-600' : 'text-emerald-600',
            link: '/admin/sla'
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm hover:border-gray-200 dark:hover:border-slate-600 transition-all"
          >
            <Link to={stat.link} className="block">
              <div className="flex justify-between items-start mb-2">
                <div className={cn('p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50', stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stat.value}
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mt-1">{stat.label}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{stat.subtext}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Activity Area Chart */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Evolução de Chamados (Últimos 7 dias)
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Comparativo de chamados abertos vs resolvidos registrados no banco
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded bg-emerald-600"></span> Abertos
              </span>
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded bg-blue-600"></span> Resolvidos
              </span>
            </div>
          </div>

          <div className="h-[280px]">
            {stats.chartData.every(d => d.abertos === 0 && d.resolvidos === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Clock className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Sem chamados registrados no período</p>
                <p className="text-xs text-gray-400">Novos chamados abertos ou resolvidos aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAbertos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResolvidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '13px' }}
                  />
                  <Area type="monotone" dataKey="abertos" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorAbertos)" name="Abertos" />
                  <Area type="monotone" dataKey="resolvidos" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorResolvidos)" name="Resolvidos" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              Chamados por Categoria
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Distribuição proporcional das solicitações dos alunos
            </p>
          </div>

          <div className="flex-1 min-h-[200px] flex items-center justify-center">
            {stats.pieData.length === 0 ? (
              <div className="text-center p-4">
                <Ticket className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nenhum chamado categorizado ainda.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            {stats.pieData.map((item, i) => (
              <div key={i} className="flex items-center text-xs">
                <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-600 dark:text-slate-300 truncate">{item.name}</span>
                <span className="ml-auto font-semibold text-gray-900 dark:text-slate-100">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Audit Events */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Atividade Recente (Auditoria Real)
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Ações administrativas e operacionais registradas no sistema
              </p>
            </div>
            <Link to="/admin/auditoria" className="text-xs font-medium text-brand-600 hover:underline">
              Ver tudo
            </Link>
          </div>

          <div className="space-y-3">
            {stats.recentAuditEvents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Nenhum evento registrado ainda.</p>
            ) : (
              stats.recentAuditEvents.map((event) => (
                <div key={event.id} className="flex gap-3 text-xs items-start p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                  <div className={cn(
                    'mt-1 w-2 h-2 rounded-full shrink-0',
                    event.severity === 'critical' ? 'bg-red-500' : event.severity === 'warning' ? 'bg-amber-500' : 'bg-brand-500'
                  )}></div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-slate-200">
                      <span className="font-semibold">{event.userName}</span>{' '}
                      <span className="text-gray-600 dark:text-slate-400 font-mono text-[11px]">[{event.action}]</span>
                    </p>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">
                      {new Date(event.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real ASA Team Members */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Equipe ASA & Ocupação
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Atendentes cadastrados e chamados sob responsabilidade ativa
              </p>
            </div>
            <Link to="/admin/asa" className="text-xs font-medium text-brand-600 hover:underline">
              Gerenciar equipe
            </Link>
          </div>

          <div className="space-y-3">
            {stats.teamStatus.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                Nenhum atendente cadastrado no ASA ainda.
              </div>
            ) : (
              stats.teamStatus.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {member.avatar ? <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">{member.name.slice(0, 2).toUpperCase()}</span>}
                      <span
                        className={cn(
                          'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800',
                          member.status === 'ativo' ? 'bg-emerald-500' : 'bg-gray-400'
                        )}
                      ></span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{member.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{member.tickets}</span>
                    <p className="text-[11px] text-gray-400">atribuídos</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
