import { prisma } from '../db'
import { AuthenticatedUser } from '../middleware/auth'
import { randomUUID } from 'node:crypto'

export class AppointmentError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message)
    this.name = 'AppointmentError'
  }
}

export interface CreateAppointmentDTO {
  studentId: string
  studentName?: string
  studentRa?: string
  studentEmail?: string
  studentCourse?: string
  subject: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMinutes?: number
  notes?: string
  desk?: string
  documentName?: string
  documentType?: string
  documentSize?: string
  documentData?: string
  r2Key?: string
}

export interface AppointmentFilterDTO {
  date?: string
  startDate?: string
  endDate?: string
  status?: string
  search?: string
  studentId?: string
}

export class AppointmentService {
  /**
   * Horários padrão de atendimento presencial na FECAP (Segunda a Sexta)
   */
  public readonly DEFAULT_SLOTS = [
    '08:30', '09:15', '10:00', '10:45', '11:30',
    '13:30', '14:15', '15:00', '15:45', '16:30',
    '17:15', '18:00', '18:45', '19:30'
  ]

  /**
   * Gera protocolo institucional único no padrão FECAP: AG-YYYY-XXXX
   */
  private generateProtocol(): string {
    const year = new Date().getFullYear()
    return `AG-${year}-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
  }

  /**
   * Constrói link direto para inclusão na Google Agenda (Google Calendar Intent)
   */
  public buildGoogleCalendarUrl(data: {
    protocol: string
    subject: string
    date: string
    time: string
    durationMinutes?: number
    studentName: string
    location?: string
    notes?: string
  }): string {
    try {
      const [year, month, day] = data.date.split('-').map(Number)
      const [hour, minute] = data.time.split(':').map(Number)
      const duration = data.durationMinutes || 30

      const startDate = new Date(`${data.date}T${data.time}:00-03:00`)
      const endDate = new Date(startDate.getTime() + duration * 60000)

      const formatIsoTime = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

      const startIso = formatIsoTime(startDate)
      const endIso = formatIsoTime(endDate)

      const title = `Atendimento Presencial ASA FECAP: ${data.subject}`
      const details = [
        `Protocolo: ${data.protocol}`,
        `Estudante: ${data.studentName}`,
        `Atendimento: Presencial na Central ASA`,
        `Local: ${data.location || 'Campus Liberdade · Bloco B · Térreo'}`,
        data.notes ? `Observações: ${data.notes}` : null,
        `\nFundação Escola de Comércio Álvares Penteado - FECAP`
      ].filter(Boolean).join('\n')

      const location = data.location || 'Campus Liberdade · Bloco B · Térreo (ASA), Av. da Liberdade, 532 - Liberdade, São Paulo - SP'

      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${startIso}/${endIso}`,
        details: details,
        location: location,
      })

      return `https://calendar.google.com/calendar/render?${params.toString()}`
    } catch {
      return ''
    }
  }

  /**
   * Gera conteúdo no formato padrão iCalendar (.ics RFC 5545)
   */
  public generateICalendar(app: any): string {
    const [year, month, day] = app.date.split('-').map(Number)
    const [hour, minute] = app.time.split(':').map(Number)
    const duration = app.durationMinutes || 30

    const startDate = new Date(`${app.date}T${app.time}:00-03:00`)
    const endDate = new Date(startDate.getTime() + duration * 60000)

    const formatICSDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const now = formatICSDate(new Date())
    const dtStart = formatICSDate(startDate)
    const dtEnd = formatICSDate(endDate)
    const uid = `${app.id || app.protocol}@fecap.br`

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FECAP//iÁlvaro - Atendimento Presencial ASA//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:Atendimento Presencial ASA FECAP - ${app.subject}`,
      `DESCRIPTION:Protocolo: ${app.protocol}\\nEstudante: ${app.studentName} (RA: ${app.studentRa})\\nAssunto: ${app.subject}\\nLocal: ${app.location}\\nObservações: ${app.notes || 'Nenhuma'}`,
      `LOCATION:${app.location}`,
      app.status === 'cancelado' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
  }

  /**
   * Lista horários disponíveis para uma data específica, informando capacidade restante
   * e aplicando a regra institucional de no máximo 1 agendamento por aluno por dia.
   */
  public async getAvailableSlots(
    date: string,
    studentId?: string
  ): Promise<{
    slots: { time: string; available: boolean; bookedCount: number; alreadyBookedByYou: boolean }[]
    userAlreadyHasBookingOnDate: boolean
    userAppointmentOnDate: { time: string; protocol: string } | null
  }> {
    // Capacidade por horário: 1 atendimento individual por guichê/horário
    const MAX_PER_SLOT = 1

    const appointments = await prisma.appointment.findMany({
      where: {
        date,
        status: { in: ['agendado', 'confirmado', 'em_atendimento'] },
      },
      select: { time: true, studentId: true, protocol: true },
    })

    const countMap: Record<string, number> = {}
    const studentBookedSet = new Set<string>()
    let studentAppointmentOnDate: { time: string; protocol: string } | null = null

    for (const app of appointments) {
      countMap[app.time] = (countMap[app.time] || 0) + 1
      if (studentId && app.studentId === studentId) {
        studentBookedSet.add(app.time)
        studentAppointmentOnDate = { time: app.time, protocol: app.protocol }
      }
    }

    const hasBookingOnDate = !!studentAppointmentOnDate

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const currentTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date())
    const slots = this.DEFAULT_SLOTS.map(time => {
      const bookedCount = countMap[time] || 0
      const alreadyBookedByYou = studentBookedSet.has(time)
      const isPast = date < today || (date === today && time <= currentTime)
      // Se o aluno já possui um agendamento neste dia, nenhum outro horário fica disponível para ele
      const isAvailable = !isPast && !hasBookingOnDate && bookedCount < MAX_PER_SLOT

      return {
        time,
        available: isAvailable,
        bookedCount,
        alreadyBookedByYou,
      }
    })

    return {
      slots,
      userAlreadyHasBookingOnDate: hasBookingOnDate,
      userAppointmentOnDate: studentAppointmentOnDate,
    }
  }

  /**
   * Consulta agendamentos com filtros (para ASA e Admin)
   */
  public async listAppointments(filters: AppointmentFilterDTO) {
    const where: any = {}

    if (filters.studentId) {
      where.studentId = filters.studentId
    }

    if (filters.date) {
      where.date = filters.date
    }

    if (filters.status && filters.status !== 'todos') {
      where.status = filters.status
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase()
      where.OR = [
        { studentName: { contains: q } },
        { studentRa: { contains: q } },
        { protocol: { contains: q } },
        { subject: { contains: q } },
        { studentEmail: { contains: q } },
      ]
    }

    const appointments = await prisma.appointment.findMany({
      where,
      omit: { documentData: true },
      orderBy: [
        { date: 'desc' },
        { time: 'asc' },
      ],
      include: {
        attendant: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return appointments
  }

  /**
   * Retorna os agendamentos do aluno logado
   */
  public async getStudentAppointments(studentId: string) {
    return prisma.appointment.findMany({
      where: { studentId },
      omit: { documentData: true },
      orderBy: [
        { date: 'desc' },
        { time: 'asc' },
      ],
    })
  }

  /**
   * Retorna detalhe de um agendamento específico
   */
  public async getById(id: string, includeDocument = false) {
    return prisma.appointment.findUnique({
      where: { id },
      omit: { documentData: !includeDocument },
      include: {
        student: true,
        attendant: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * Cria novo agendamento presencial com validação, geração de protocolo e LGPD audit log
   */
  public async createAppointment(data: CreateAppointmentDTO, authorUser?: AuthenticatedUser) {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    })

    if (!student) throw new AppointmentError('Selecione um aluno cadastrado para agendar o atendimento.', 400)
    const studentName = student.name
    const studentRa = student.ra
    const studentEmail = student.email
    const studentCourse = student.course

    // Protocolo com entropia suficiente para evitar colisões entre Workers.
    const protocol = this.generateProtocol()
    const location = 'Campus Liberdade · Bloco B · Térreo (Central ASA)'
    const gCalLink = this.buildGoogleCalendarUrl({
      protocol,
      subject: data.subject,
      date: data.date,
      time: data.time,
      durationMinutes: data.durationMinutes || 30,
      studentName,
      location,
      notes: data.notes,
    })

    // O advisory lock é transacional no PostgreSQL e serializa reservas do mesmo
    // dia/horário entre instâncias do Worker. SQLite é usado apenas nos testes locais.
    const appointment = await prisma.$transaction(async tx => {
      if (process.env.NODE_ENV === 'production') {
        // The lock function returns PostgreSQL `void`, which Prisma cannot deserialize.
        // Keep the transaction-scoped lock while exposing only a supported integer column.
        await tx.$queryRawUnsafe(
          'SELECT 1::integer AS locked FROM (SELECT pg_advisory_xact_lock(hashtext($1))) AS appointment_lock',
          `appointment:${data.date}`,
        )
      }
      const activeStatuses = ['agendado', 'confirmado', 'em_atendimento']
      const existingStudentAppOnDate = await tx.appointment.findFirst({
        where: { studentId: data.studentId, date: data.date, status: { in: activeStatuses } },
      })
      if (existingStudentAppOnDate) {
        throw new AppointmentError(`Você já possui um agendamento presencial ativo para o dia ${data.date} às ${existingStudentAppOnDate.time} (Protocolo: ${existingStudentAppOnDate.protocol}).`, 409)
      }
      const slotBookedCount = await tx.appointment.count({
        where: { date: data.date, time: data.time, status: { in: activeStatuses } },
      })
      if (slotBookedCount >= 1) {
        throw new AppointmentError(`O horário das ${data.time} no dia ${data.date} já foi preenchido. Escolha outro horário disponível.`, 409)
      }
      return tx.appointment.create({
        omit: { documentData: true },
        data: {
          protocol, studentId: data.studentId, studentName, studentRa, studentEmail, studentCourse,
          subject: data.subject, date: data.date, time: data.time,
          durationMinutes: data.durationMinutes || 30, location,
          desk: data.desk || 'Guichê Presencial ASA', notes: data.notes || '', status: 'confirmado',
          googleCalendarLink: gCalLink, documentName: data.documentName || null,
          documentType: data.documentType || null, documentSize: data.documentSize || null,
          documentData: data.documentData || null, r2Key: data.r2Key || null,
        },
      })
    }, { timeout: 8_000 })

    // 4. Registro de Auditoria / LGPD (Rastreabilidade e Finalidade de Tratamento)
    try {
      await prisma.auditEvent.create({
        data: {
          userId: authorUser?.id || data.studentId,
          userName: authorUser?.name || studentName,
          userRole: authorUser?.role || 'aluno',
          action: 'Agendamento Presencial Criado',
          resource: 'Agendamento ASA',
          resourceId: protocol,
          details: `Agendamento criado para ${data.date} às ${data.time} no Guichê Presencial ASA. Assunto: ${data.subject}. Documento: ${data.documentName ? `Anexado (${data.documentName})` : 'Nenhum'}. Base Legal: LGPD Art. 7, V (execução de contrato / atendimento acadêmico).`,
          severity: 'info',
        },
      })
    } catch (auditErr) {
      console.warn('Erro ao salvar log de auditoria LGPD do agendamento:', auditErr)
    }

    return appointment
  }

  /**
   * Atualiza status do agendamento (ex: Iniciar atendimento, Concluir, Cancelar)
   */
  public async updateStatus(
    id: string,
    status: string,
    resolutionNotes?: string,
    user?: AuthenticatedUser
  ) {
    const existing = await prisma.appointment.findUnique({ where: { id }, omit: {documentData:true} })
    if (!existing) throw new AppointmentError('Agendamento não encontrado.', 404)

    const transitions: Record<string, string[]> = {
      agendado: ['confirmado', 'cancelado'],
      confirmado: ['em_atendimento', 'cancelado', 'ausente'],
      em_atendimento: ['concluido', 'cancelado', 'ausente'],
      concluido: [], cancelado: [], ausente: [],
    }
    if (!(status in transitions)) throw new AppointmentError('Status de agendamento inválido.', 400)
    if (status !== existing.status && !transitions[existing.status]?.includes(status)) {
      throw new AppointmentError(`Não é possível alterar um agendamento de ${existing.status} para ${status}.`, 409)
    }
    if (status === 'concluido' && (!resolutionNotes || !resolutionNotes.trim())) {
      throw new AppointmentError('Informe as observações da conclusão do atendimento.', 400)
    }

    const updateData: any = { status }
    if (resolutionNotes) {
      updateData.resolutionNotes = resolutionNotes
    }

    if (user && (user.role === 'asa' || user.role === 'admin')) {
      updateData.attendantId = user.id
      updateData.attendantName = user.name
    }

    const updated = await prisma.appointment.update({
      omit: { documentData: true },
      where: { id },
      data: updateData,
    })

    // Audit log
    try {
      await prisma.auditEvent.create({
        data: {
          userId: user?.id || null,
          userName: user?.name || 'Sistema',
          userRole: user?.role || 'asa',
          action: `Status Agendamento: ${status.toUpperCase()}`,
          resource: 'Agendamento ASA',
          resourceId: existing.protocol,
          details: `Status alterado de "${existing.status}" para "${status}". Observações: ${resolutionNotes || 'Sem observações'}.`,
          severity: status === 'cancelado' ? 'warning' : 'info',
        },
      })
    } catch (e) {
      console.warn('Erro ao registrar auditoria de atualização:', e)
    }

    return updated
  }

  /**
   * Cancela agendamento pelo próprio aluno ou pela equipe ASA
   */
  public async cancelAppointment(id: string, reason?: string, user?: AuthenticatedUser) {
    return this.updateStatus(id, 'cancelado', reason || 'Cancelado pelo solicitante', user)
  }

  /**
   * Métricas agregadas do calendário de agendamentos
   */
  public async getMetrics() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

    const [total, todayCount, inProgressCount, completedCount, cancelledCount] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { date: today } }),
      prisma.appointment.count({ where: { date: today, status: 'em_atendimento' } }),
      prisma.appointment.count({ where: { status: 'concluido' } }),
      prisma.appointment.count({ where: { status: 'cancelado' } }),
    ])

    return {
      total,
      todayCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      attendanceRate: total - cancelledCount > 0
        ? Math.round((completedCount / (total - cancelledCount)) * 100)
        : 0,
    }
  }
}

export const appointmentService = new AppointmentService()
