import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, Calendar, DollarSign, Ticket, Send, ArrowRight,
  GraduationCap, Clock, Award, CheckCircle2, AlertTriangle, Sparkles,
  QrCode, Users, BellRing, ChevronRight, HelpCircle, ShieldCheck
} from 'lucide-react'
import { mockConversations, mockTickets } from '../../lib/mock-data'
import { formatRelative } from '../../lib/utils'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import PriorityBadge from '../../components/ui/PriorityBadge'
import SLAIndicator from '../../components/ui/SLAIndicator'
import FecapLogo from '../../components/ui/FecapLogo'
import { useAppStore } from '../../store/app-store'

export default function AlunoDashboard() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const currentUser = useAppStore(state => state.currentUser)

  const studentId = currentUser?.id || 'aluno-01'
  const recentConversations = mockConversations.filter(c => c.studentId === studentId).slice(0, 3)
  const openTickets = mockTickets.filter(t => t.studentId === studentId && ['aberto', 'em_atendimento', 'aguardando_aluno'].includes(t.status))

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/aluno/chat?q=${encodeURIComponent(query)}`)
    }
  }

  const quickServices = [
    {
      icon: FileText,
      title: 'Documentos & Declarações',
      desc: 'Atestado de matrícula, histórico e passe escolar',
      path: '/aluno/documentos',
      badge: 'Online',
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      icon: Sparkles,
      title: 'Assistente Álvaro AI (Chat IA)',
      desc: 'Tire dúvidas 24/7 sobre regras, prazos e notas',
      path: '/aluno/chat',
      badge: 'IA 24/7',
      color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
    },
    {
      icon: Ticket,
      title: 'Abrir Chamado ASA',
      desc: 'Envie solicitações formais para atendimento humano',
      path: '/aluno/chamados/novo',
      badge: 'Protocolo',
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    },
    {
      icon: Users,
      title: 'Agendamento Presencial / Online',
      desc: 'Reserve horário com um orientador do ASA',
      path: '/aluno/agendamento',
      badge: 'Horários',
      color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    },
    {
      icon: Calendar,
      title: 'Calendário & Prazos 2026',
      desc: 'Datas de provas, rematrícula e feriados letivos',
      path: '/aluno/chat?cat=prazos',
      badge: 'Acadêmico',
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      icon: DollarSign,
      title: 'Financeiro & Mensalidades',
      desc: '2ª via de boletos, acordos e bolsas',
      path: '/aluno/chat?cat=financeiro',
      badge: 'Em dia',
      color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    },
  ]

  const promptSuggestions = [
    'Como solicitar carteirinha digital?',
    'Emitir atestado de matrícula',
    'Simular desconto de pontualidade',
    'Qual prazo para trancar disciplina?',
    'Como validar horas complementares?',
  ]

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* ── Student Academic Identity Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-card relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-600 text-white font-bold text-2xl flex items-center justify-center shadow-md flex-shrink-0 border-2 border-white dark:border-slate-700">
              {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('') : 'AL'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Olá, {currentUser?.name || 'Estudante'} 👋
                </h1>
                <Badge variant="success" dot>Matrícula Ativa</Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {currentUser?.course || 'Graduação'} · <strong>{currentUser?.semester || 1}º Semestre</strong> · {currentUser?.period || 'Noite'} · RA: <strong className="font-mono text-gray-900 dark:text-slate-200">{currentUser?.ra || '24000000'}</strong>
              </p>
              <div className="flex items-center gap-3 pt-1 text-2xs text-gray-500 dark:text-slate-400">
                <span>Campus Liberdade</span>
                <span>•</span>
                <span>Semestre Letivo 2026/2</span>
                <span>•</span>
                <span className="text-brand-700 dark:text-brand-400 font-semibold">{currentUser?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/aluno/documentos')}
              icon={<FileText size={16} />}
            >
              Meus Documentos
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/aluno/chamados/novo')}
              icon={<Ticket size={16} />}
            >
              Novo Chamado
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Official Institutional Alert ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <BellRing size={20} />
        </div>
        <div className="flex-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-gray-900 dark:text-white">
              Aviso Importante: Período de Solicitação de Aproveitamento de Disciplinas
            </h4>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-brand-600 text-white">
              Até 15/09
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
            O prazo para envio de ementas e pedidos de dispensa de matérias para o semestre 2026/2 está aberto. O protocolo pode ser aberto diretamente pelo menu de Chamados.
          </p>
        </div>
      </motion.div>

      {/* ── Interactive ASAIA AI Search Box ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-sm text-teal-300">
              <Sparkles size={14} />
              Inteligência Artificial Álvaro AI
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              O que você precisa resolver hoje?
            </h2>
            <p className="text-sm text-green-100/70">
              Pergunte em linguagem natural ou clique em uma das sugestões abaixo:
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Como faço para emitir meu histórico escolar ou trancar matéria?"
              className="w-full h-14 pl-5 pr-16 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm sm:text-base backdrop-blur-md focus:bg-white/15 focus:border-brand-400 focus:outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 aspect-square bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-md"
            >
              <Send size={18} />
            </button>
          </form>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {promptSuggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => navigate(`/aluno/chat?q=${encodeURIComponent(sug)}`)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-green-100 backdrop-blur-sm transition-all"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Self-Service Grid ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Serviços & Autoatendimento 1-Click
          </h3>
          <span className="text-xs text-gray-500 dark:text-slate-400">Atendimento 24 horas</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickServices.map((serv, i) => {
            const Icon = serv.icon
            return (
              <motion.button
                key={i}
                onClick={() => navigate(serv.path)}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-5 shadow-card hover:shadow-card-md transition-all text-left flex items-start gap-4 group"
              >
                <div className={`p-3.5 rounded-2xl ${serv.color} transition-transform group-hover:scale-105 flex-shrink-0 shadow-sm`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                      {serv.title}
                    </h4>
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 flex-shrink-0">
                      {serv.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {serv.desc}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Student Progress & Metrics Cards ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Horas Complementares */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Horas Complementares</span>
            <Award size={16} className="text-brand-600" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 dark:text-white">85h</span>
              <span className="text-xs text-gray-400">Meta: 120h</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-brand-600 h-full rounded-full" style={{ width: '70.8%' }} />
            </div>
          </div>
          <p className="text-2xs text-brand-700 dark:text-brand-400 font-medium">70.8% concluído (Faltam 35h)</p>
        </div>

        {/* Frequência Geral */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Frequência Geral</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">92%</span>
              <span className="text-xs text-gray-400">Mínimo: 75%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
            </div>
          </div>
          <p className="text-2xs text-gray-500 dark:text-slate-400">Sem risco de reprovação por falta</p>
        </div>

        {/* Situação Financeira */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Mensalidade</span>
            <DollarSign size={16} className="text-brand-600" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-gray-900 dark:text-white">Em Dia</span>
              <span className="text-xs text-emerald-600 font-semibold">100% Pago</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Próx. vencimento: <strong>05/09/2026</strong></p>
          </div>
          <p className="text-2xs text-brand-700 dark:text-brand-400 font-medium">Desconto de pontualidade ativo</p>
        </div>

        {/* Próximas Avaliações */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Semana de Provas</span>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">22 a 26/09</div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Avaliações Regimentais (P1)</p>
          </div>
          <p className="text-2xs text-amber-600 dark:text-amber-400 font-medium">Faltam 23 dias</p>
        </div>
      </div>

      {/* ── Active Tickets & Recent AI Conversations ── */}
      <div className="grid md:grid-cols-2 gap-8 pt-4">
        {/* Active Tickets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Meus Chamados em Andamento
              </h3>
              <Badge variant="brand">{openTickets.length}</Badge>
            </div>
            <button
              onClick={() => navigate('/aluno/chamados')}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400 flex items-center gap-1"
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {openTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/aluno/chamados/${ticket.id}`)}
                className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all cursor-pointer shadow-card space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-mono font-bold text-brand-700 dark:text-brand-400">
                        #{ticket.number}
                      </span>
                      <span className="text-2xs uppercase tracking-wider font-semibold text-gray-400">
                        {ticket.category}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mt-1 group-hover:text-brand-700 transition-colors">
                      {ticket.title}
                    </h4>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>

                <div className="flex items-center justify-between text-2xs text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={ticket.priority} showIcon={false} />
                    <span>Atualizado {formatRelative(ticket.updatedAt)}</span>
                  </div>
                  <SLAIndicator deadline={ticket.slaDeadline} status={ticket.slaStatus} />
                </div>
              </div>
            ))}

            {openTickets.length === 0 && (
              <div className="text-center p-8 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Você não tem chamados pendentes</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Precisa de suporte? Abra um chamado quando desejar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent AI Chats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Conversas Recentes com a IA
              </h3>
              <Badge variant="info">Álvaro AI</Badge>
            </div>
            <button
              onClick={() => navigate('/aluno/chat')}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400 flex items-center gap-1"
            >
              Novo Chat <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {recentConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => navigate(`/aluno/chat/${conv.id}`)}
                className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all cursor-pointer shadow-card flex items-center justify-between gap-4 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-brand-700 transition-colors">
                    {conv.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    {conv.lastMessage}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-2xs text-gray-400 block">{formatRelative((conv as any).timestamp || conv.updatedAt || conv.createdAt)}</span>
                  <span className="text-3xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold mt-1 inline-block">
                    {(conv.messages?.length || 0)} mensagens
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
