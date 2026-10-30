import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ChevronRight, Ticket as TicketIcon, Search,
  Clock, CheckCircle2, AlertTriangle, Filter, Sparkles, ArrowUpRight
} from 'lucide-react'
import { mockTickets, Ticket, TicketStatus } from '../../lib/mock-data'
import { formatRelative, cn } from '../../lib/utils'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import PriorityBadge from '../../components/ui/PriorityBadge'
import SLAIndicator from '../../components/ui/SLAIndicator'
import { api } from '../../lib/api'

type Filter = 'todos' | TicketStatus

export default function AlunoChamados() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets.filter(t => t.studentId === 'aluno-01'))

  useEffect(() => {
    api.tickets.list({ studentId: 'aluno-01' })
      .then(res => {
        if (res && res.length > 0) {
          setTickets(res)
        }
      })
      .catch(err => console.error('Erro ao buscar chamados:', err))
  }, [])

  const allTickets = tickets

  const filteredTickets = allTickets.filter(t => {
    const matchesStatus = filter === 'todos' || t.status === filter
    const matchesCategory = selectedCategory === 'todas' || t.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = searchTerm === '' ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.number.toString().includes(searchTerm) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesCategory && matchesSearch
  })

  // Quick stats
  const totalCount = allTickets.length
  const emAtendimentoCount = allTickets.filter(t => ['aberto', 'em_atendimento', 'aguardando_aluno'].includes(t.status)).length
  const resolvidosCount = allTickets.filter(t => t.status === 'resolvido').length
  const riskCount = allTickets.filter(t => t.slaStatus === 'risk').length

  const filters: { value: Filter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'aberto', label: 'Abertos' },
    { value: 'em_atendimento', label: 'Em atendimento' },
    { value: 'aguardando_aluno', label: 'Aguardando minha resposta' },
    { value: 'resolvido', label: 'Resolvidos' },
    { value: 'fechado', label: 'Fechados' },
  ]

  const categories = ['todas', 'matricula', 'financeiro', 'academico', 'documentos', 'infraestrutura', 'outros']

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Central de Chamados & Requerimentos
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Acompanhe em tempo real o andamento de seus protocolos e SLAs de atendimento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/aluno/chat')}
            icon={<Sparkles size={16} />}
          >
            Tirar Dúvida na IA
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/aluno/chamados/novo')}
            icon={<Plus size={16} />}
          >
            Abrir Novo Chamado
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card">
          <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Total de Chamados</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{totalCount}</span>
            <TicketIcon size={20} className="text-brand-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card">
          <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Em Andamento</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{emAtendimentoCount}</span>
            <Clock size={20} className="text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card">
          <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Resolvidos</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{resolvidosCount}</span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card">
          <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Atenção / Risco SLA</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{riskCount}</span>
            <AlertTriangle size={20} className="text-rose-500" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número (#1052), assunto ou palavra-chave..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-gray-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 outline-none w-full sm:w-44"
            >
              <option value="todas">Todas Categorias</option>
              <option value="matricula">Matrícula</option>
              <option value="financeiro">Financeiro</option>
              <option value="academico">Acadêmico</option>
              <option value="documentos">Documentos</option>
              <option value="infraestrutura">Infraestrutura</option>
              <option value="outros">Outros</option>
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide border-t border-gray-100 dark:border-slate-700/60 pt-3">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                filter === f.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Ticket List ── */}
      <div className="space-y-3">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              key={ticket.id}
              onClick={() => navigate(`/aluno/chamados/${ticket.id}`)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-card-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  #{ticket.number}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-3xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                      {ticket.category}
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                    <span className="text-2xs text-gray-400">
                      Criado em {formatRelative(ticket.createdAt)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-base text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                    {ticket.title}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
                    {ticket.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-slate-700/60 shrink-0">
                <div className="text-right space-y-1">
                  <StatusBadge status={ticket.status} />
                  <div className="text-2xs">
                    <SLAIndicator deadline={ticket.slaDeadline} status={ticket.slaStatus} />
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-700 text-gray-400 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <ChevronRight size={18} />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-gray-400">
              <TicketIcon size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Nenhum chamado encontrado</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                Não encontramos solicitações com os filtros atuais. Tente buscar por outros termos ou abra um novo requerimento.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/aluno/chamados/novo')}
              icon={<Plus size={16} />}
            >
              Abrir Novo Chamado
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
