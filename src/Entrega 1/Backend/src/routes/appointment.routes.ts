import { Router, Response } from 'express'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'
import { appointmentService } from '../services/appointment.service'
import { r2Service } from '../services/r2.service'
import { prisma } from '../db'

export const appointmentRouter = Router()

/**
 * GET /api/appointments/slots
 * Retorna horários disponíveis e vagas restantes para uma determinada data
 */
appointmentRouter.get('/slots', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.query
    const targetDate = String(date || new Date().toISOString().split('T')[0])
    const studentId = req.user?.role === 'aluno' ? req.user.id : undefined
    const result = await appointmentService.getAvailableSlots(targetDate, studentId)
    res.json({ date: targetDate, ...result })
  } catch (error: any) {
    console.error('Erro ao buscar horários disponíveis:', error)
    res.status(500).json({ error: error.message || 'Erro ao consultar horários disponíveis.' })
  }
})

/**
 * GET /api/appointments/metrics
 * Métricas do fluxo de agendamento presencial (para dashboard do ASA)
 */
appointmentRouter.get('/metrics', authenticateToken, requireRole(['asa', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await appointmentService.getMetrics()
    res.json(metrics)
  } catch (error: any) {
    console.error('Erro ao buscar métricas de agendamento:', error)
    res.status(500).json({ error: error.message || 'Erro ao buscar métricas de agendamento.' })
  }
})

/**
 * GET /api/appointments/my
 * Retorna os agendamentos do aluno autenticado
 */
appointmentRouter.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.user?.id
    if (!studentId) {
      return res.status(401).json({ error: 'Identificação do estudante não encontrada na sessão.' })
    }

    const appointments = await appointmentService.getStudentAppointments(studentId)
    res.json(appointments)
  } catch (error: any) {
    console.error('Erro ao buscar agendamentos do estudante:', error)
    res.status(500).json({ error: error.message || 'Erro ao buscar seus agendamentos.' })
  }
})

/**
 * GET /api/appointments
 * Lista geral de agendamentos com filtros (para ASA e Admin)
 */
appointmentRouter.get('/', authenticateToken, requireRole(['asa', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, status, search, studentId } = req.query

    const appointments = await appointmentService.listAppointments({
      date: date ? String(date) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
      studentId: studentId ? String(studentId) : undefined,
    })

    res.json(appointments)
  } catch (error: any) {
    console.error('Erro ao listar agendamentos:', error)
    res.status(500).json({ error: error.message || 'Erro ao listar agendamentos.' })
  }
})

/**
 * GET /api/appointments/:id
 * Consulta detalhe de um agendamento
 */
appointmentRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const appointment = await appointmentService.getById(id)

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' })
    }

    // Aluno só pode consultar seus próprios agendamentos
    if (req.user?.role === 'aluno' && appointment.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado aos dados deste agendamento (LGPD).' })
    }

    res.json(appointment)
  } catch (error: any) {
    console.error('Erro ao buscar detalhe do agendamento:', error)
    res.status(500).json({ error: error.message || 'Erro ao carregar agendamento.' })
  }
})

/**
 * POST /api/appointments
 * Cria novo agendamento presencial
 */
appointmentRouter.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      subject,
      date,
      time,
      notes,
      studentId,
      studentName,
      studentRa,
      studentEmail,
      studentCourse,
      documentName,
      documentType,
      documentSize,
      documentData,
    } = req.body

    if (!subject || !date || !time) {
      return res.status(400).json({ error: 'Assunto, data e horário são campos obrigatórios para o agendamento presencial.' })
    }

    // Se o solicitante for aluno, vincula seu ID diretamente
    const targetStudentId = req.user?.role === 'aluno' ? req.user.id : (studentId || req.user?.id)

    const appointment = await appointmentService.createAppointment({
      studentId: targetStudentId,
      studentName,
      studentRa,
      studentEmail,
      studentCourse,
      subject,
      date,
      time,
      notes,
      documentName,
      documentType,
      documentSize,
      documentData,
    }, req.user)

    // Sincronização de arquivo no Cloudflare R2 e persistência do r2Key no banco
    if (documentData && r2Service.isConfigured()) {
      try {
        const sanitizedName = (documentName || 'anexo').replace(/[^a-zA-Z0-9._-]/g, '_')
        const r2Key = `agendamentos/${appointment.id}/${sanitizedName}`
        await r2Service.uploadBase64(r2Key, documentData)
        // Salva a chave R2 no registro do agendamento
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { r2Key },
        })
        appointment.r2Key = r2Key
        console.log(`☁️ Documento do agendamento persistido no R2 e r2Key salvo: ${r2Key}`)
      } catch (r2Err: any) {
        console.warn('Falha na persistência R2 do anexo do agendamento:', r2Err.message)
      }
    }

    res.status(201).json(appointment)
  } catch (error: any) {
    console.error('Erro ao criar agendamento presencial:', error)
    res.status(500).json({ error: error.message || 'Erro ao confirmar agendamento presencial.' })
  }
})

/**
 * GET /api/appointments/:id/document
 * Retorna o documento anexo do agendamento presencial
 */
appointmentRouter.get('/:id/document', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const appointment = await appointmentService.getById(id)

    if (!appointment || !appointment.documentData) {
      return res.status(404).json({ error: 'Nenhum documento anexo encontrado para este agendamento.' })
    }

    if (req.user?.role === 'aluno' && appointment.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado ao documento deste agendamento (LGPD).' })
    }

    res.json({
      name: appointment.documentName || 'documento-agendamento',
      type: appointment.documentType || 'application/octet-stream',
      size: appointment.documentSize || '0 KB',
      dataUrl: appointment.documentData,
    })
  } catch (error: any) {
    console.error('Erro ao buscar documento do agendamento:', error)
    res.status(500).json({ error: error.message || 'Erro ao carregar documento.' })
  }
})

/**
 * PATCH /api/appointments/:id/status
 * Atualiza o status do agendamento (iniciar atendimento, concluir, cancelar)
 */
/**
 * GET /api/appointments/:id/download
 * Baixa o documento anexo do agendamento presencial hospedado no Cloudflare R2
 */
appointmentRouter.get('/:id/download', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const appointment = await appointmentService.getById(id)

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' })
    }

    if (req.user?.role === 'aluno' && appointment.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso não autorizado ao documento deste agendamento (LGPD).' })
    }

    if (appointment.r2Key && r2Service.isConfigured()) {
      const presignedUrl = await r2Service.getPresignedUrl(appointment.r2Key, 3600)
      if (presignedUrl) {
        return res.redirect(presignedUrl)
      }
    }

    if (appointment.documentData) {
      return res.json({
        name: appointment.documentName || 'anexo',
        dataUrl: appointment.documentData,
      })
    }

    return res.status(404).json({ error: 'Nenhum documento físico localizado no Cloudflare R2.' })
  } catch (error: any) {
    console.error('Erro ao baixar documento do R2:', error)
    res.status(500).json({ error: 'Erro ao gerar download do anexo.' })
  }
})

appointmentRouter.patch('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const { status, resolutionNotes } = req.body

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório.' })
    }

    // Se aluno tentar alterar, só tem permissão de cancelar seu próprio agendamento
    if (req.user?.role === 'aluno') {
      const existing = await appointmentService.getById(id)
      if (!existing || existing.studentId !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode alterar seus próprios agendamentos.' })
      }
      if (status !== 'cancelado') {
        return res.status(403).json({ error: 'Alunos só podem cancelar agendamentos.' })
      }
    }

    const updated = await appointmentService.updateStatus(id, status, resolutionNotes, req.user)
    res.json(updated)
  } catch (error: any) {
    console.error('Erro ao atualizar status do agendamento:', error)
    res.status(500).json({ error: error.message || 'Erro ao atualizar status do agendamento.' })
  }
})

/**
 * GET /api/appointments/:id/ics
 * Gera e entrega arquivo iCalendar (.ics) para sincronização com Google Agenda e Outlook
 */
appointmentRouter.get('/:id/ics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const appointment = await appointmentService.getById(id)

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' })
    }

    const icsContent = appointmentService.generateICalendar(appointment)

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="fecap-agendamento-${appointment.protocol}.ics"`)
    res.send(icsContent)
  } catch (error: any) {
    console.error('Erro ao gerar iCalendar .ics:', error)
    res.status(500).json({ error: error.message || 'Erro ao gerar arquivo de calendário.' })
  }
})
