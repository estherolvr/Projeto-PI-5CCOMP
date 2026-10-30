import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, MapPin, CheckCircle2,
  AlertCircle, ShieldCheck, Download, ExternalLink,
  XCircle, ChevronRight, Info, Building2, UserCheck,
  Upload, FileText, Trash2, Paperclip, FileCheck
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/api'
import { useAppStore } from '../../store/app-store'
import type { Appointment } from '../../lib/mock-data'

export default function AlunoAgendamento() {
  const { show } = useToast()
  const { currentUser } = useAppStore()

  // Form states
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loadingSubmit, setLoadingSubmit] = useState(false)

  // Document upload state
  const [attachedFile, setAttachedFile] = useState<{
    file: File
    name: string
    size: string
    type: string
    dataUrl: string
  } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Slots state from backend
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean; bookedCount: number }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Confirmation modal
  const [confirmedModal, setConfirmedModal] = useState(false)
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null)

  // List of existing student appointments
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const subjects = [
    { id: 'matr', label: 'Orientação de Matrícula e Grade Horária', icon: '📚', desc: 'Ajuste de matérias, pré-requisitos e turmas' },
    { id: 'fin', label: 'Acordo e Negociação Financeira / Bolsas', icon: '💰', desc: 'Mensalidades, parcelamento, Prouni e FIES' },
    { id: 'disp', label: 'Aproveitamento de Estudos / Dispensa', icon: '📄', desc: 'Validação de matérias de outra faculdade' },
    { id: 'estg', label: 'Validação de Contrato de Estágio', icon: '💼', desc: 'Assinatura e conferência de termos e TCE' },
    { id: 'geral', label: 'Outros Assuntos / Suporte Geral', icon: '💬', desc: 'Orientação presencial com nossa equipe' },
  ]

  // Generate dynamic upcoming business days (ignoring weekends)
  const generateUpcomingDays = () => {
    const days: { date: string; dayLabel: string; formatted: string }[] = []
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const today = new Date()

    let count = 0
    let offset = 0
    while (count < 5) {
      const d = new Date(today)
      d.setDate(today.getDate() + offset)
      const dayOfWeek = d.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        days.push({
          date: dateStr,
          dayLabel: offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : dayNames[dayOfWeek],
          formatted: `${dd}/${mm}`,
        })
        count++
      }
      offset++
    }
    return days
  }

  const upcomingDays = generateUpcomingDays()

  // Initialize selected date to the first available day
  useEffect(() => {
    if (upcomingDays.length > 0 && !selectedDate) {
      setSelectedDate(upcomingDays[0].date)
    }
  }, [])

  const fetchSlots = async (date: string) => {
    if (!date) return
    setLoadingSlots(true)
    try {
      const res = await api.appointments.slots(date)
      const slots = res.slots || []
      setAvailableSlots(slots)
      // Auto-select first available time if current selection is no longer valid
      const currentValid = slots.find(s => s.time === selectedTime && s.available)
      if (!currentValid) {
        const firstOpen = slots.find(s => s.available)
        setSelectedTime(firstOpen ? firstOpen.time : '')
      }
    } catch {
      // Fallback slots if offline/mock
      const mockSlots = [
        '08:30', '09:15', '10:00', '10:45', '11:30',
        '13:30', '14:15', '15:00', '15:45', '16:30',
        '17:15', '18:00', '18:45', '19:30'
      ].map(time => ({ time, available: true, bookedCount: 0 }))
      setAvailableSlots(mockSlots)
      if (!selectedTime) setSelectedTime('14:15')
    } finally {
      setLoadingSlots(false)
    }
  }

  // Load slots when selected date changes
  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate)
    }
  }, [selectedDate])

  // Load student's existing appointments
  const fetchMyAppointments = async () => {
    setLoadingList(true)
    try {
      const data = await api.appointments.my()
      setMyAppointments(data)
    } catch (err) {
      console.error('Erro ao buscar meus agendamentos:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchMyAppointments()
  }, [])

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 10MB
    const MAX_SIZE = 8 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setUploadError('O arquivo selecionado excede o limite máximo permitido de 8 MB.')
      show('Arquivo muito grande. O limite máximo é de 8 MB.', 'warning')
      return
    }

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const reader = new FileReader()
    reader.onload = () => {
      setAttachedFile({
        file,
        name: file.name,
        size: formatSize(file.size),
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string,
      })
      show(`Documento "${file.name}" anexado com sucesso!`, 'info')
    }
    reader.onerror = () => {
      setUploadError('Erro ao ler o arquivo selecionado. Tente novamente.')
      show('Erro ao processar o arquivo.', 'error')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setAttachedFile(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle form submit
  const handleConfirm = async () => {
    if (!selectedSubject) {
      show('Por favor, selecione o assunto do atendimento presencial.', 'warning')
      return
    }
    if (!selectedDate || !selectedTime) {
      show('Por favor, escolha uma data e horário válidos.', 'warning')
      return
    }

    const alreadyBookedToday = myAppointments.find(
      a => a.date === selectedDate && (a.status === 'confirmado' || a.status === 'agendado' || a.status === 'em_atendimento')
    )
    if (alreadyBookedToday) {
      show(`Você já possui um atendimento presencial agendado para este dia às ${alreadyBookedToday.time}. É permitido apenas 1 horário por dia.`, 'warning')
      return
    }

    setLoadingSubmit(true)
    try {
      const response = await api.appointments.create({
        subject: selectedSubject,
        date: selectedDate,
        time: selectedTime,
        notes: notes.trim(),
        studentId: currentUser?.id,
        studentName: currentUser?.name,
        studentRa: currentUser?.ra,
        studentEmail: currentUser?.email,
        studentCourse: currentUser?.course,
        documentName: attachedFile?.name,
        documentType: attachedFile?.type,
        documentSize: attachedFile?.size,
        documentData: attachedFile?.dataUrl,
      })

      setCreatedAppointment(response)
      setConfirmedModal(true)
      show('Agendamento presencial confirmado com sucesso!', 'success')

      // Desmarca o horário agendado e atualiza a grade para que o horário reservado desapareça
      setSelectedTime('')
      setNotes('')
      handleRemoveFile()
      await Promise.all([fetchMyAppointments(), fetchSlots(selectedDate)])
    } catch (err: any) {
      console.error('Erro ao registrar agendamento presencial:', err)
      const msg = err.message || 'Erro ao comunicar com o servidor de agendamentos.'
      show(`Não foi possível confirmar o agendamento: ${msg}`, 'error')
    } finally {
      setLoadingSubmit(false)
    }
  }

  // Handle cancellation
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await api.appointments.updateStatus(cancelTarget.id, 'cancelado', 'Cancelado pelo aluno via portal')
      show('Agendamento cancelado com sucesso.', 'info')
      setCancelTarget(null)
      await Promise.all([fetchMyAppointments(), fetchSlots(selectedDate)])
    } catch (err: any) {
      show(err.message || 'Erro ao cancelar agendamento.', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmado':
        return <Badge variant="success">Confirmado</Badge>
      case 'em_atendimento':
        return <Badge variant="warning">Em Atendimento</Badge>
      case 'concluido':
        return <Badge variant="default">Concluído</Badge>
      case 'cancelado':
        return <Badge variant="error">Cancelado</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xs font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-full">
            Central de Atendimento ASA
          </span>
          <span className="text-2xs font-medium text-gray-500 dark:text-slate-400">
            Atendimento 100% Presencial no Campus
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Agendamento de Atendimento Presencial
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Reserve um horário exclusivo no balcão presencial da Área de Sucesso Alvarista (ASA) para solucionar pendências de matrícula, finanças, aproveitamento de estudos e validação física de documentos.
        </p>
      </div>

      {/* Institutional Location Banner */}
      <div className="p-5 rounded-2xl border border-brand-200 dark:border-brand-900/50 bg-gradient-to-r from-brand-50/80 via-emerald-50/30 to-brand-50/50 dark:from-brand-950/30 dark:via-slate-800 dark:to-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Campus Liberdade · Bloco B · Térreo
              </h3>
              <Badge variant="success">Presencial</Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
              Av. da Liberdade, 532 · Sala da Central ASA (ao lado do pátio central). Atendimento com horário marcado sem filas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-brand-100 dark:border-slate-700 shadow-2xs">
          <UserCheck size={16} />
          Guichês Exclusivos
        </div>
      </div>

      {/* Booking Form Grid */}
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-card space-y-8">
        {/* Step 1: Subject Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Selecione o Assunto do Atendimento
            </label>
            <span className="text-xs text-gray-400 dark:text-slate-500">Obrigatório</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((sub) => {
              const isSelected = selectedSubject === sub.label
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubject(sub.label)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-900/30 text-brand-900 dark:text-brand-200 ring-2 ring-brand-500/20 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-50/50 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="text-xs font-bold leading-tight">{sub.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-snug">
                    {sub.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Date and Time Selection */}
        <div className="space-y-4 border-t border-gray-100 dark:border-slate-700 pt-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              Escolha a Data e Horário no Campus
            </label>
            <span className="text-xs text-gray-400 dark:text-slate-500">Dias úteis · 30 min por sessão</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Dates column */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                Selecione o Dia:
              </span>
              <div className="space-y-2">
                {upcomingDays.map((item) => {
                  const isSelected = selectedDate === item.date
                  const appOnThisDay = myAppointments.find(
                    a => a.date === item.date && (a.status === 'confirmado' || a.status === 'agendado' || a.status === 'em_atendimento')
                  )

                  return (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => setSelectedDate(item.date)}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/70 dark:bg-brand-900/30 text-brand-900 dark:text-brand-300 font-bold ring-2 ring-brand-500/20'
                          : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className={isSelected ? 'text-brand-600' : 'text-gray-400'} />
                        <div>
                          <p className="text-sm font-bold flex items-center gap-2">
                            {item.dayLabel}
                            {appOnThisDay && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center gap-1">
                                <CheckCircle2 size={10} /> {appOnThisDay.time}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 font-normal">
                            Data: {item.date} ({item.formatted})
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className={isSelected ? 'text-brand-600' : 'text-gray-300'} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Times column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Horários Presenciais Disponíveis:
                </span>
                {loadingSlots && (
                  <span className="text-2xs text-gray-400 animate-pulse">Atualizando vagas...</span>
                )}
              </div>

              {/* Se o aluno já possui agendamento confirmado neste dia: Bloqueia a seleção e exibe orientações */}
              {myAppointments.some(a => a.date === selectedDate && (a.status === 'confirmado' || a.status === 'agendado' || a.status === 'em_atendimento')) ? (
                (() => {
                  const existingApp = myAppointments.find(a => a.date === selectedDate && (a.status === 'confirmado' || a.status === 'agendado' || a.status === 'em_atendimento'))!
                  return (
                    <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                        <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                        <span>Limite Institucional: 1 agendamento por dia</span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        Você já possui um atendimento presencial confirmado para <strong>{selectedDate}</strong> às <strong>{existingApp.time}</strong> (Protocolo: <strong className="font-mono">#{existingApp.protocol}</strong>).
                      </p>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-300 space-y-1">
                        <div className="font-bold text-gray-900 dark:text-white">Assunto marcado:</div>
                        <div>{existingApp.subject}</div>
                        <div className="text-2xs text-gray-400">Local: {existingApp.location}</div>
                      </div>
                      <p className="text-2xs text-amber-700 dark:text-amber-400 leading-relaxed">
                        Pelas diretrizes da Central ASA, cada estudante pode realizar <strong>no máximo 1 agendamento presencial por dia</strong> para que todos os alunos tenham acesso aos guichês. Se deseja trocar de horário, cancele o atendimento atual abaixo.
                      </p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setCancelTarget(existingApp)}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                        >
                          Cancelar Horário das {existingApp.time} para Escolher Outro
                        </button>
                      </div>
                    </div>
                  )
                })()
              ) : availableSlots.filter(s => s.available).length === 0 && !loadingSlots ? (
                <div className="p-6 text-center text-xs text-gray-500 border border-dashed rounded-xl space-y-1">
                  <p className="font-semibold text-gray-700 dark:text-slate-300">
                    Nenhum horário livre para {selectedDate}.
                  </p>
                  <p className="text-gray-400">
                    Todos os horários desta data já foram preenchidos ou reservados. Por favor, escolha outro dia na coluna ao lado.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots
                    .filter(s => s.available)
                    .map(({ time }) => {
                      const isSelected = selectedTime === time
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                              : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Clock size={12} className="mx-auto mb-1 opacity-70" />
                          {time}
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Notes & Document Upload & LGPD Notice */}
        <div className="space-y-5 border-t border-gray-100 dark:border-slate-700 pt-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              Observações & Documentos para o Atendimento
            </label>
            <span className="text-2xs text-gray-400 dark:text-slate-500">Opcional</span>
          </div>

          {/* Observações em texto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Observações ou Detalhes da Solicitação:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Exemplo: Preciso assinar o TCE da empresa XP Investimentos; trago as 3 vias físicas impressas e carimbadas."
              rows={3}
              className="w-full p-3.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-600 outline-none text-gray-800 dark:text-slate-100"
            />
          </div>

          {/* Upload de Documento Presencial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip size={14} className="text-brand-600" />
                Anexar Documento Digitalizado (PDF, Imagem ou DOCX):
              </label>
              <span className="text-[11px] text-gray-400">Até 10 MB</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
              className="hidden"
            />

            {!attachedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-5 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-900/40 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                  <Upload size={18} />
                </div>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                  Clique para selecionar ou arraste o documento aqui
                </p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                  Atestado, contrato de estágio (TCE), comprovante, RG ou requerimento (PDF, PNG, JPG até 10 MB)
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/60 dark:bg-brand-950/30 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <FileCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {attachedFile.name}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      {attachedFile.size} • Anexo pronto para o atendimento
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                    Anexado
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    title="Remover anexo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* LGPD Compliance Banner */}
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck size={18} className="text-brand-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-gray-900 dark:text-white">Privacidade e Proteção de Dados (LGPD)</span>
              <p className="text-[11px] leading-relaxed">
                Seus dados cadastrais e o histórico deste agendamento são processados de acordo com a Lei 13.709/2018 (Art. 7º, V) estritamente para viabilizar a recepção presencial, conferência documental e atendimento pelo ASA da FECAP.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-3">
            {myAppointments.some(a => a.date === selectedDate && (a.status === 'confirmado' || a.status === 'agendado' || a.status === 'em_atendimento')) ? (
              <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertCircle size={16} />
                Você já possui um agendamento neste dia. Limite de 1 por dia.
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirm}
                disabled={!selectedSubject || !selectedDate || !selectedTime || loadingSubmit}
                loading={loadingSubmit}
                icon={<CheckCircle2 size={18} />}
              >
                Confirmar Agendamento Presencial
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Section: My Existing Appointments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Meus Agendamentos no ASA
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Histórico de horários reservados e comprovantes para o Campus Liberdade.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchMyAppointments} loading={loadingList}>
            Atualizar
          </Button>
        </div>

        {myAppointments.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl">
            <Calendar size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              Você ainda não possui nenhum agendamento presencial.
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Escolha um assunto e horário acima para reservar seu atendimento no campus.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-card hover:border-brand-200 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md">
                        {apt.protocol}
                      </span>
                      {getStatusBadge(apt.status)}
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                      {apt.subject}
                    </h3>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/40 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-brand-600" />
                    <span><strong>Data:</strong> {apt.date} às <strong>{apt.time}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand-600" />
                    <span className="truncate">{apt.location}</span>
                  </div>
                  {apt.notes && (
                    <div className="pt-1 text-[11px] text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700">
                      <strong>Obs:</strong> {apt.notes}
                    </div>
                  )}
                  {apt.documentName && (
                    <div className="pt-1.5 flex items-center justify-between text-[11px] text-brand-700 dark:text-brand-300 border-t border-gray-200 dark:border-slate-700 bg-brand-50/50 dark:bg-brand-950/20 px-2.5 py-1.5 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <Paperclip size={12} className="text-brand-600 flex-shrink-0" />
                        <span className="font-semibold truncate">{apt.documentName}</span>
                        {apt.documentSize && <span className="text-gray-400 text-[10px]">({apt.documentSize})</span>}
                      </div>
                      {apt.documentData && (
                        <a
                          href={apt.documentData}
                          download={apt.documentName}
                          className="font-bold text-brand-600 hover:text-brand-800 dark:hover:text-brand-200 flex items-center gap-1 ml-2 flex-shrink-0 text-2xs"
                          title="Baixar documento anexado"
                        >
                          <Download size={11} /> Baixar
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions: Google Agenda & Download ICS */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    {apt.googleCalendarLink && (
                      <a
                        href={apt.googleCalendarLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-2xs font-semibold text-brand-700 dark:text-brand-400 hover:underline bg-brand-50 dark:bg-brand-900/20 px-2.5 py-1.5 rounded-lg"
                      >
                        <ExternalLink size={12} />
                        Google Agenda
                      </a>
                    )}
                    <a
                      href={api.appointments.getIcsUrl(apt.id)}
                      download={`agendamento-${apt.protocol}.ics`}
                      className="inline-flex items-center gap-1.5 text-2xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700"
                    >
                      <Download size={12} />
                      .ICS
                    </a>
                  </div>

                  {(apt.status === 'confirmado' || apt.status === 'agendado') && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(apt)}
                      className="text-2xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal / Voucher */}
      <Modal
        open={confirmedModal}
        onClose={() => setConfirmedModal(false)}
        title="Agendamento Presencial Confirmado!"
        description="Seu protocolo foi gerado no sistema da Central ASA"
        size="md"
        footer={
          <div className="flex items-center gap-2 w-full">
            {createdAppointment?.googleCalendarLink && (
              <a
                href={createdAppointment.googleCalendarLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <ExternalLink size={14} />
                Adicionar ao Google Agenda
              </a>
            )}
            <Button variant="primary" onClick={() => setConfirmedModal(false)} className="flex-1">
              Concluir
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Protocolo #{createdAppointment?.protocol || 'AG-2026-8819'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Apresente este protocolo ou seu RA ao chegar na recepção da Central ASA.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Modalidade:</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">Atendimento 100% Presencial</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Assunto:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{createdAppointment?.subject || selectedSubject}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Data e Hora:</span>
              <span className="font-bold text-brand-700 dark:text-brand-300">
                {createdAppointment?.date || selectedDate} às {createdAppointment?.time || selectedTime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Local:</span>
              <span className="font-semibold text-gray-900 dark:text-white">Campus Liberdade · Bloco B · Térreo</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Estudante:</span>
              <span className="text-gray-900 dark:text-white">{currentUser?.name} (RA: {currentUser?.ra})</span>
            </div>
            {createdAppointment?.documentName && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-slate-700">
                <span className="text-gray-500 dark:text-slate-400">Documento Anexado:</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  <Paperclip size={12} /> {createdAppointment.documentName}
                </span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar Agendamento Presencial?"
        description="Esta ação liberará seu horário para outros estudantes no ASA"
        size="sm"
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Voltar
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} loading={cancelling}>
              Confirmar Cancelamento
            </Button>
          </div>
        }
      >
        <div className="text-xs text-gray-600 dark:text-slate-300 space-y-2">
          <p>
            Você está prestes a cancelar o agendamento do protocolo <strong>{cancelTarget?.protocol}</strong> marcado para <strong>{cancelTarget?.date} às {cancelTarget?.time}</strong>.
          </p>
          <p className="text-gray-400">
            Você poderá realizar um novo agendamento a qualquer momento através deste mesmo portal.
          </p>
        </div>
      </Modal>
    </div>
  )
}
