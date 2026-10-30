import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon, Clock, User, CheckCircle2,
  AlertCircle, Search, Filter, Download, ExternalLink,
  ChevronLeft, ChevronRight, Plus, MapPin, Building2,
  RefreshCw, ShieldCheck, CheckCircle, XCircle, PlayCircle,
  Share2, CalendarDays, Eye, Sparkles, Copy, Check, Paperclip, FileText
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/api'
import { useAppStore } from '../../store/app-store'
import type { Appointment, AppointmentStatus } from '../../lib/mock-data'

type ViewMode = 'calendar' | 'timeline' | 'table'

export default function AsaAgendamentos() {
  const { show } = useToast()
  const { currentUser } = useAppStore()

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Selected date for calendar/timeline (defaults to today in YYYY-MM-DD format)
  const getTodayStr = () => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  // Metrics
  const [metrics, setMetrics] = useState({
    total: 0,
    todayCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    attendanceRate: 100,
  })

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [submittingStatus, setSubmittingStatus] = useState(false)

  // External Calendar / Google Agenda Modal
  const [googleModalOpen, setGoogleModalOpen] = useState(false)

  // Modal de Visualização de Documento Anexado
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<{
    name: string
    type?: string
    size?: string
    dataUrl?: string
    protocol?: string
    studentName?: string
  } | null>(null)

  const handleOpenDocument = (apt: Appointment) => {
    if (!apt.documentName && !apt.documentData && !(apt as any).r2Key) return
    if ((apt as any).r2Key && !apt.documentData) {
      const token = localStorage.getItem('asaia_auth_token') || ''
      const url = api.appointments.getDownloadUrl(apt.id)
      window.open(`${url}?token=${encodeURIComponent(token)}`, '_blank')
      return
    }
    setPreviewDocument({
      name: apt.documentName || 'documento-agendamento',
      type: apt.documentType,
      size: apt.documentSize,
      dataUrl: apt.documentData,
      protocol: apt.protocol,
      studentName: apt.studentName,
    })
    setDocumentModalOpen(true)
  }
  const [copiedFeed, setCopiedFeed] = useState(false)

  // New Appointment Modal for Attendant
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newFormData, setNewFormData] = useState({
    studentName: '',
    studentRa: '',
    studentEmail: '',
    studentCourse: 'Administração',
    subject: 'Orientação de Matrícula e Grade Horária',
    date: getTodayStr(),
    time: '14:15',
    notes: '',
  })
  const [submittingNew, setSubmittingNew] = useState(false)

  // Fetch appointments and metrics
  const loadData = async () => {
    setLoading(true)
    try {
      const [listData, metricsData] = await Promise.all([
        api.appointments.list(),
        api.appointments.metrics().catch(() => ({
          total: 0, todayCount: 0, inProgressCount: 0, completedCount: 0, cancelledCount: 0, attendanceRate: 100
        }))
      ])
      setAppointments(listData)
      setMetrics(metricsData)
    } catch (err: any) {
      console.error('Erro ao carregar agendamentos:', err)
      show('Erro ao carregar dados do calendário de agendamentos.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchesName = apt.studentName.toLowerCase().includes(q)
        const matchesRa = apt.studentRa.toLowerCase().includes(q)
        const matchesProto = apt.protocol.toLowerCase().includes(q)
        const matchesSubject = apt.subject.toLowerCase().includes(q)
        if (!matchesName && !matchesRa && !matchesProto && !matchesSubject) return false
      }

      // Status filter
      if (statusFilter !== 'todos' && apt.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [appointments, searchTerm, statusFilter])

  // Appointments for the currently selected date
  const selectedDateAppointments = useMemo(() => {
    return filteredAppointments.filter(apt => apt.date === selectedDate)
  }, [filteredAppointments, selectedDate])

  // Count appointments by date (map for calendar days)
  const dateCountsMap = useMemo(() => {
    const map: Record<string, number> = {}
    appointments.forEach(apt => {
      if (apt.status !== 'cancelado') {
        map[apt.date] = (map[apt.date] || 0) + 1
      }
    })
    return map
  }, [appointments])

  // Handlers for appointment status changes
  const handleStartAttendance = async (apt: Appointment) => {
    try {
      await api.appointments.updateStatus(apt.id, 'em_atendimento')
      show(`Atendimento presencial do aluno(a) ${apt.studentName} iniciado.`, 'success')
      loadData()
      if (selectedAppointment?.id === apt.id) {
        setSelectedAppointment({ ...apt, status: 'em_atendimento' })
      }
    } catch (err: any) {
      show(err.message || 'Erro ao iniciar atendimento.', 'error')
    }
  }

  const handleOpenCompleteModal = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setResolutionNotes('')
    setCompleteModalOpen(true)
  }

  const handleConfirmComplete = async () => {
    if (!selectedAppointment) return
    setSubmittingStatus(true)
    try {
      await api.appointments.updateStatus(
        selectedAppointment.id,
        'concluido',
        resolutionNotes.trim() || 'Atendimento presencial concluído pela equipe ASA.'
      )
      show(`Agendamento de ${selectedAppointment.studentName} marcado como concluído.`, 'success')
      setCompleteModalOpen(false)
      loadData()
    } catch (err: any) {
      show(err.message || 'Erro ao concluir agendamento.', 'error')
    } finally {
      setSubmittingStatus(false)
    }
  }

  const handleCancelAppointment = async (apt: Appointment) => {
    if (!window.confirm(`Deseja realmente marcar o agendamento de ${apt.studentName} como cancelado/ausente?`)) return
    try {
      await api.appointments.updateStatus(apt.id, 'cancelado', 'Cancelado ou aluno ausente na Central ASA')
      show('Agendamento cancelado.', 'info')
      loadData()
      if (selectedAppointment?.id === apt.id) {
        setSelectedAppointment({ ...apt, status: 'cancelado' })
      }
    } catch (err: any) {
      show(err.message || 'Erro ao cancelar.', 'error')
    }
  }

  // Create new appointment via attendant modal
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFormData.studentName || !newFormData.studentRa) {
      show('Nome e RA do estudante são obrigatórios.', 'warning')
      return
    }

    setSubmittingNew(true)
    try {
      await api.appointments.create({
        studentName: newFormData.studentName,
        studentRa: newFormData.studentRa,
        studentEmail: newFormData.studentEmail || `${newFormData.studentRa}@aluno.fecap.br`,
        studentCourse: newFormData.studentCourse,
        subject: newFormData.subject,
        date: newFormData.date,
        time: newFormData.time,
        notes: newFormData.notes,
      })
      show('Agendamento presencial cadastrado com sucesso!', 'success')
      setNewModalOpen(false)
      loadData()
      setNewFormData({
        studentName: '',
        studentRa: '',
        studentEmail: '',
        studentCourse: 'Administração',
        subject: 'Orientação de Matrícula e Grade Horária',
        date: getTodayStr(),
        time: '14:15',
        notes: '',
      })
    } catch (err: any) {
      show(err.message || 'Erro ao registrar agendamento.', 'error')
    } finally {
      setSubmittingNew(false)
    }
  }

  // Copy iCal Feed link
  const copyFeedLink = () => {
    const url = `${window.location.origin}/api/appointments/slots`
    navigator.clipboard.writeText(url)
    setCopiedFeed(true)
    show('Link do calendário institucional copiado para a área de transferência!', 'info')
    setTimeout(() => setCopiedFeed(false), 3000)
  }

  // Calendar rendering helpers
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const getStatusBadge = (status: AppointmentStatus | string) => {
    switch (status) {
      case 'confirmado':
        return <Badge variant="success">Confirmado</Badge>
      case 'em_atendimento':
        return <Badge variant="warning">Em Atendimento</Badge>
      case 'concluido':
        return <Badge variant="default">Concluído</Badge>
      case 'cancelado':
        return <Badge variant="error">Cancelado</Badge>
      case 'ausente':
        return <Badge variant="error">Ausente</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xs font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2.5 py-0.5 rounded-full">
              Área de Sucesso Alvarista · ASA
            </span>
            <span className="text-2xs text-gray-500 dark:text-slate-400">
              Campus Liberdade · Bloco B
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-600" />
            Calendário de Atendimentos Presenciais
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">
            Painel institucional para gestão da escala presencial de atendimento no campus e integração direta com o Google Agenda.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGoogleModalOpen(true)}
            icon={<ExternalLink size={14} className="text-blue-500" />}
          >
            Google Agenda & APIs
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Novo Agendamento
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            loading={loading}
            title="Atualizar dados"
          >
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Agendamentos Hoje</span>
            <CalendarIcon size={16} className="text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {metrics.todayCount}
          </p>
          <span className="text-2xs text-brand-600 font-medium">Na Central ASA</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Em Atendimento</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {metrics.inProgressCount}
          </p>
          <span className="text-2xs text-gray-400">Nos guichês agora</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Concluídos</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.completedCount}
          </p>
          <span className="text-2xs text-gray-400">Atendimentos finalizados</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Taxa de Presença</span>
            <Sparkles size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {metrics.attendanceRate}%
          </p>
          <span className="text-2xs text-gray-400">Comparecimento</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Agendados</span>
            <Building2 size={16} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {metrics.total}
          </p>
          <span className="text-2xs text-gray-400">Registros no sistema</span>
        </div>
      </div>

      {/* Control Bar: Filters, Search & View Toggles */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por aluno, RA, protocolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg">
            {['todos', 'confirmado', 'em_atendimento', 'concluido', 'cancelado'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition-colors capitalize ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-800 text-brand-600 font-bold shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            <CalendarIcon size={14} />
            Calendário
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-slate-800 text-brand-600 font-bold shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            <Clock size={14} />
            Horários do Dia
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-800 text-brand-600 font-bold shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            <Filter size={14} />
            Tabela
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'calendar' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Monthly Calendar Grid (2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                  {monthName}
                </h2>
                <button
                  onClick={() => setSelectedDate(getTodayStr())}
                  className="text-2xs font-semibold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                >
                  Ir para Hoje
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Week header */}
            <div className="grid grid-cols-7 text-center text-2xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty placeholder cells for offset */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 sm:h-24 p-1 opacity-20 rounded-xl" />
              ))}

              {/* Real Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const isSelected = selectedDate === dayDateStr
                const isToday = dayDateStr === getTodayStr()
                const count = dateCountsMap[dayDateStr] || 0

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDate(dayDateStr)}
                    className={`h-20 sm:h-24 p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-900/30 ring-2 ring-brand-500/20'
                        : isToday
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-gray-100 dark:border-slate-750 bg-gray-50/30 dark:bg-slate-850 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${
                        isSelected ? 'text-brand-600 font-extrabold' : isToday ? 'text-emerald-600' : 'text-gray-700 dark:text-slate-300'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Hoje" />
                      )}
                    </div>

                    {count > 0 && (
                      <div className="w-full">
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-600 text-white truncate max-w-full">
                          {count} {count === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day Detail & Queue Pane (1 col) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-card space-y-4 flex flex-col h-[600px]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Escala de Atendimento: {selectedDate}
                </h3>
                <p className="text-2xs text-gray-500 dark:text-slate-400">
                  {selectedDateAppointments.length} agendamento(s) para este dia
                </p>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                Guichê Presencial
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedDateAppointments.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Clock size={32} className="mx-auto text-gray-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                    Nenhum agendamento para {selectedDate}.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewFormData(prev => ({ ...prev, date: selectedDate }))
                      setNewModalOpen(true)
                    }}
                    icon={<Plus size={14} />}
                  >
                    Agendar Aluno para este Dia
                  </Button>
                </div>
              ) : (
                selectedDateAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30 space-y-2.5 hover:border-brand-500 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-brand-600 font-mono">
                            {apt.time}
                          </span>
                          <span className="text-2xs text-gray-400 font-mono">
                            {apt.protocol}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                          {apt.studentName}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">
                          RA: {apt.studentRa} · {apt.studentCourse || 'Administração'}
                        </p>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>

                    <div className="text-2xs text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                      <strong>Assunto:</strong> {apt.subject}
                    </div>
                    {apt.documentName && (
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-800/40 text-2xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Paperclip size={12} className="text-brand-600 dark:text-brand-400 flex-shrink-0" />
                          <span className="truncate font-medium text-gray-800 dark:text-slate-200" title={apt.documentName}>
                            {apt.documentName}
                          </span>
                          {apt.documentSize && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">({apt.documentSize})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(apt)}
                            className="px-2 py-0.5 rounded bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[10px] transition-colors"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (apt.documentData) {
                                const a = document.createElement('a')
                                a.href = apt.documentData
                                a.download = apt.documentName || 'anexo'
                                a.click()
                              } else {
                                const token = localStorage.getItem('asaia_auth_token') || ''
                                const url = api.appointments.getDownloadUrl(apt.id)
                                window.open(`${url}?token=${encodeURIComponent(token)}`, '_blank')
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold text-[10px] hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            Baixar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Attendant Actions */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-gray-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        {apt.googleCalendarLink && (
                          <a
                            href={apt.googleCalendarLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-gray-400 hover:text-brand-600"
                            title="Abrir no Google Agenda"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <a
                          href={api.appointments.getIcsUrl(apt.id)}
                          download
                          className="p-1 rounded text-gray-400 hover:text-gray-700"
                          title="Baixar .ics"
                        >
                          <Download size={14} />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {apt.status === 'confirmado' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStartAttendance(apt)}
                            icon={<PlayCircle size={13} />}
                          >
                            Atender
                          </Button>
                        )}
                        {apt.status === 'em_atendimento' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCompleteModal(apt)}
                            icon={<CheckCircle size={13} />}
                          >
                            Concluir
                          </Button>
                        )}
                        {apt.status !== 'concluido' && apt.status !== 'cancelado' && (
                          <button
                            onClick={() => handleCancelAppointment(apt)}
                            className="text-2xs text-red-500 hover:underline px-1"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline View Mode */}
      {viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Grade de Horários do Dia: {selectedDate}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Capacidade instalada: Guichês 01, 02 e 03 (Central ASA Campus Liberdade).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            {[
              '08:30', '09:15', '10:00', '10:45', '11:30',
              '13:30', '14:15', '15:00', '15:45', '16:30',
              '17:15', '18:00', '18:45', '19:30'
            ].map(time => {
              const matches = selectedDateAppointments.filter(a => a.time === time)

              return (
                <div
                  key={time}
                  className="flex items-start gap-4 p-3.5 rounded-xl border border-gray-100 dark:border-slate-750 bg-gray-50/40 dark:bg-slate-850"
                >
                  <div className="w-16 font-mono font-bold text-sm text-gray-700 dark:text-slate-300 pt-1">
                    {time}
                  </div>

                  <div className="flex-1">
                    {matches.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">
                        Horário livre (sem agendamentos)
                      </span>
                    ) : (
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {matches.map(apt => (
                          <div
                            key={apt.id}
                            className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xs font-mono font-semibold text-brand-600">
                                {apt.protocol}
                              </span>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {apt.studentName}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                RA: {apt.studentRa} · {apt.subject}
                              </p>
                            </div>
                            <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-slate-700">
                              {apt.status === 'confirmado' && (
                                <Button size="sm" variant="primary" onClick={() => handleStartAttendance(apt)}>
                                  Atender
                                </Button>
                              )}
                              {apt.status === 'em_atendimento' && (
                                <Button size="sm" variant="outline" onClick={() => handleOpenCompleteModal(apt)}>
                                  Concluir
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table View Mode */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 text-gray-500 font-semibold uppercase text-2xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Protocolo</th>
                  <th className="py-3.5 px-4">Estudante</th>
                  <th className="py-3.5 px-4">Assunto</th>
                  <th className="py-3.5 px-4">Data & Horário</th>
                  <th className="py-3.5 px-4">Guichê / Local</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Nenhum agendamento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map(apt => (
                    <tr key={apt.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-brand-600">
                        {apt.protocol}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{apt.studentName}</div>
                        <div className="text-[11px] text-gray-400">RA: {apt.studentRa} · {apt.studentCourse}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-gray-800 dark:text-slate-200">
                        <div className="font-medium truncate">{apt.subject}</div>
                        {apt.documentName && (
                          <div className="flex items-center gap-1.5 mt-1 text-2xs text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-950/30 px-2 py-0.5 rounded-md border border-brand-200/50 dark:border-brand-800/40 w-fit">
                            <Paperclip size={11} className="flex-shrink-0" />
                            <span className="truncate max-w-[150px] font-semibold">{apt.documentName}</span>
                            {apt.documentData && (
                              <a
                                href={apt.documentData}
                                download={apt.documentName}
                                className="font-bold underline hover:text-brand-800 dark:hover:text-brand-200 ml-1"
                                title="Baixar anexo do aluno"
                              >
                                Baixar
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-white">{apt.date}</span>
                        <span className="text-gray-400 ml-1">às {apt.time}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                        {apt.desk || 'Guichê Presencial'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(apt.status)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {apt.status === 'confirmado' && (
                          <button
                            onClick={() => handleStartAttendance(apt)}
                            className="text-xs font-semibold text-brand-600 hover:underline"
                          >
                            Atender
                          </button>
                        )}
                        {apt.status === 'em_atendimento' && (
                          <button
                            onClick={() => handleOpenCompleteModal(apt)}
                            className="text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            Concluir
                          </button>
                        )}
                        {apt.googleCalendarLink && (
                          <a
                            href={apt.googleCalendarLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                            title="Google Agenda"
                          >
                            Agenda
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LGPD Institutional Footer Notice */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck size={20} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-gray-900 dark:text-white">
            Conformidade com a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018)
          </span>
          <p className="text-[11px] leading-relaxed">
            As informações de agendamentos e dados de estudantes exibidos nesta tela destinam-se exclusivamente para finalidade acadêmica e recepção presencial na Central ASA da FECAP (Art. 7º, V da LGPD). Todas as consultas, alterações de status e interações dos atendentes são devidamente registradas para efeito de auditoria e prestação de contas institucional.
          </p>
        </div>
      </div>

      {/* MODAL 1: Google Agenda & External Calendar Integration */}
      <Modal
        open={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        title="Integração Google Agenda & APIs de Calendário"
        description="Sincronização de eventos e escala presencial com serviços externos"
        size="md"
        footer={
          <Button variant="primary" onClick={() => setGoogleModalOpen(false)} className="w-full">
            Fechar
          </Button>
        }
      >
        <div className="space-y-5 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-blue-900 dark:text-blue-300">
                Sincronização Ativa com Google Calendar
              </h4>
              <p className="text-[11px] text-blue-800 dark:text-blue-400 leading-relaxed">
                Todos os agendamentos presenciais geram automaticamente links diretos de inclusão no Google Agenda (Google Calendar URL Intent) e arquivos no padrão internacional RFC 5545 (iCalendar .ics).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-gray-900 dark:text-white">
              URL do Feed de Sincronização iCal / WebCal:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/api/appointments/slots`}
                className="flex-1 p-2.5 font-mono text-2xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 select-all"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyFeedLink}
                icon={copiedFeed ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              >
                {copiedFeed ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className="text-2xs text-gray-400">
              Utilize esta URL no Google Agenda em "Outras agendas" &gt; "Do URL" para espelhar a escala de atendimento em tempo real.
            </p>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-2">
            <h4 className="font-bold text-gray-900 dark:text-white">
              Status dos Serviços de Calendário Externo
            </h4>
            <div className="space-y-1.5 text-2xs">
              <div className="flex justify-between py-1 px-2.5 rounded bg-gray-50 dark:bg-slate-900">
                <span className="text-gray-600 dark:text-slate-400">Google Calendar Web Intent:</span>
                <span className="font-bold text-emerald-600">● Operacional</span>
              </div>
              <div className="flex justify-between py-1 px-2.5 rounded bg-gray-50 dark:bg-slate-900">
                <span className="text-gray-600 dark:text-slate-400">iCalendar RFC 5545 Generator:</span>
                <span className="font-bold text-emerald-600">● Operacional</span>
              </div>
              <div className="flex justify-between py-1 px-2.5 rounded bg-gray-50 dark:bg-slate-900">
                <span className="text-gray-600 dark:text-slate-400">Webhook de Notificação por E-mail:</span>
                <span className="font-bold text-emerald-600">● Operacional</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Complete Appointment / Register Resolution Notes */}
      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Concluir Atendimento Presencial"
        description={`Registrar encerramento do protocolo #${selectedAppointment?.protocol}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setCompleteModalOpen(false)} disabled={submittingStatus}>
              Voltar
            </Button>
            <Button variant="primary" onClick={handleConfirmComplete} loading={submittingStatus}>
              Confirmar Conclusão
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="bg-gray-50 dark:bg-slate-900 p-3.5 rounded-xl space-y-1">
            <p><strong>Estudante:</strong> {selectedAppointment?.studentName} (RA: {selectedAppointment?.studentRa})</p>
            <p><strong>Assunto:</strong> {selectedAppointment?.subject}</p>
            <p><strong>Data & Horário:</strong> {selectedAppointment?.date} às {selectedAppointment?.time}</p>
          </div>

          
          {selectedAppointment?.documentName && (
            <div className="p-3 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip size={16} className="text-brand-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {selectedAppointment.documentName}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Documento anexado pelo estudante {selectedAppointment.documentSize ? `(${selectedAppointment.documentSize})` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenDocument(selectedAppointment)}
                  className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                >
                  Visualizar
                </button>
                {selectedAppointment.documentData && (
                  <a
                    href={selectedAppointment.documentData}
                    download={selectedAppointment.documentName}
                    className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50"
                  >
                    Baixar
                  </a>
                )}
              </div>
            </div>
          )}
<div className="space-y-2">
            <label className="font-semibold text-gray-900 dark:text-white">
              Parecer / Observações do Atendimento Concluído (LGPD):
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Ex: Documentos conferidos e assinados pela coordenadoria. Aluno orientado quanto aos prazos acadêmicos."
              rows={3}
              className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-2xs text-gray-400">
              Este parecer ficará registrado no prontuário do estudante para histórico de atendimento.
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: New Appointment by Attendant */}
      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Novo Agendamento Presencial no ASA"
        description="Agendar horário presencial diretamente no balcão"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setNewModalOpen(false)} disabled={submittingNew}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateNew} loading={submittingNew}>
              Cadastrar Agendamento
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateNew} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-gray-900 dark:text-white block mb-1">
              Nome do Estudante *
            </label>
            <input
              type="text"
              required
              value={newFormData.studentName}
              onChange={(e) => setNewFormData({ ...newFormData, studentName: e.target.value })}
              placeholder="Ex: Esther Rodrigues"
              className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-900 dark:text-white block mb-1">
                RA do Aluno *
              </label>
              <input
                type="text"
                required
                value={newFormData.studentRa}
                onChange={(e) => setNewFormData({ ...newFormData, studentRa: e.target.value })}
                placeholder="Ex: 24001523"
                className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-900 dark:text-white block mb-1">
                Curso
              </label>
              <select
                value={newFormData.studentCourse}
                onChange={(e) => setNewFormData({ ...newFormData, studentCourse: e.target.value })}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 outline-none"
              >
                <option value="Administração">Administração</option>
                <option value="Ciências Contábeis">Ciências Contábeis</option>
                <option value="Economia">Economia</option>
                <option value="Publicidade e Propaganda">Publicidade e Propaganda</option>
                <option value="Relações Internacionais">Relações Internacionais</option>
                <option value="Ciência da Computação">Ciência da Computação</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-900 dark:text-white block mb-1">
              Assunto do Atendimento *
            </label>
            <select
              value={newFormData.subject}
              onChange={(e) => setNewFormData({ ...newFormData, subject: e.target.value })}
              className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 outline-none"
            >
              <option value="Orientação de Matrícula e Grade Horária">Orientação de Matrícula e Grade Horária</option>
              <option value="Acordo e Negociação Financeira / Bolsas">Acordo e Negociação Financeira / Bolsas</option>
              <option value="Aproveitamento de Estudos / Dispensa">Aproveitamento de Estudos / Dispensa</option>
              <option value="Validação de Contrato de Estágio">Validação de Contrato de Estágio</option>
              <option value="Outros Assuntos / Suporte Geral">Outros Assuntos / Suporte Geral</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-900 dark:text-white block mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={newFormData.date}
                onChange={(e) => setNewFormData({ ...newFormData, date: e.target.value })}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-900 dark:text-white block mb-1">
                Horário *
              </label>
              <select
                value={newFormData.time}
                onChange={(e) => setNewFormData({ ...newFormData, time: e.target.value })}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 outline-none"
              >
                {[
                  '08:30', '09:15', '10:00', '10:45', '11:30',
                  '13:30', '14:15', '15:00', '15:45', '16:30',
                  '17:15', '18:00', '18:45', '19:30'
                ].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-900 dark:text-white block mb-1">
              Observações (Opcional)
            </label>
            <textarea
              value={newFormData.notes}
              onChange={(e) => setNewFormData({ ...newFormData, notes: e.target.value })}
              placeholder="Descreva detalhes ou orientações prévias..."
              rows={2}
              className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 outline-none"
            />
          </div>
        </form>
      </Modal>
    
      {/* MODAL 4: Document Preview for Attendant */}
      <Modal
        open={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        title="Documento Anexado pelo Estudante"
        description={`Protocolo: #${previewDocument?.protocol || 'Presencial'} · Aluno(a): ${previewDocument?.studentName || 'Estudante'}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-2xs text-gray-500">
              {previewDocument?.name} ({previewDocument?.size || 'Anexo'})
            </span>
            <div className="flex items-center gap-2">
              {previewDocument?.dataUrl && (
                <a
                  href={previewDocument.dataUrl}
                  download={previewDocument.name}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download size={14} />
                  Baixar Arquivo
                </a>
              )}
              {previewDocument?.dataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const win = window.open('')
                    if (win) {
                      win.document.write(`<iframe src="${previewDocument.dataUrl}" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`)
                      win.document.title = previewDocument.name
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  Abrir em Nova Aba
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setDocumentModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {previewDocument?.dataUrl ? (
            previewDocument.type?.startsWith('image/') || previewDocument.name?.match(/\.(png|jpe?g|gif|webp)$/i) ? (
              <div className="max-h-[60vh] overflow-auto flex items-center justify-center p-2 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                <img
                  src={previewDocument.dataUrl}
                  alt={previewDocument.name}
                  className="max-h-[55vh] object-contain rounded-lg shadow-sm"
                />
              </div>
            ) : (
              <div className="h-[60vh] w-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900">
                <iframe
                  src={previewDocument.dataUrl}
                  title={previewDocument.name}
                  className="w-full h-full border-0"
                />
              </div>
            )
          ) : (
            <div className="text-center py-12 space-y-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
              <FileText size={40} className="mx-auto text-gray-400" />
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                {previewDocument?.name || 'Documento Anexo'}
              </p>
              <p className="text-xs text-gray-500">
                O arquivo está registrado no prontuário do atendimento.
              </p>
            </div>
          )}
        </div>
      </Modal>

    </div>
  )
}
