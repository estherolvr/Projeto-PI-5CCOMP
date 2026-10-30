import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'
import { aiService } from '../services/ai.service'

export const ticketRouter = Router()

const staffSelect = { id: true, name: true, email: true, avatar: true, department: true }
function currentSla(ticket: { status: string; slaDeadline: Date; slaStatus: string }) {
  if (['resolvido', 'fechado'].includes(ticket.status)) return ticket.slaStatus
  const remaining = ticket.slaDeadline.getTime() - Date.now()
  return remaining <= 0 ? 'breached' : remaining < 3_600_000 ? 'risk' : 'ok'
}

// List tickets with filters
ticketRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, category, priority, studentId, assignedTo, search } = req.query

    const where: any = {}

    if (status && status !== 'todos') {
      where.status = String(status)
    }

    if (category && category !== 'todas') {
      where.category = String(category)
    }

    if (priority && priority !== 'todas') {
      where.priority = String(priority)
    }

    if (req.user?.role === 'aluno') {
      where.studentId = req.user.id
    } else if (studentId) {
      where.studentId = String(studentId)
    }

    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        where.assignedTo = null
      } else {
        where.assignedTo = String(assignedTo)
      }
    }

    if (search) {
      const q = String(search).toLowerCase()
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { student: { name: { contains: q } } },
        { student: { ra: { contains: q } } },
      ]
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        student: true,
        attendant: {
          select: { id: true, name: true, email: true, avatar: true, department: true },
        },
        aiSuggestion: true,
        messages: {
          where: req.user?.role === 'aluno' ? { isInternal: false } : undefined,
          orderBy: { createdAt: 'asc' },
          include: { attachments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = tickets.map(t => ({
      ...t,
      slaStatus: currentSla(t),
      tags: JSON.parse(t.tags || '[]'),
    }))

    res.json(formatted)
  } catch (error) {
    console.error('Erro ao listar chamados:', error)
    res.status(500).json({ error: 'Erro ao buscar chamados' })
  }
})

// Get single ticket by ID
ticketRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        student: true,
        attendant: {
          select: { id: true, name: true, email: true, avatar: true, department: true },
        },
        conversation: {
          include: {
            messages: {
              orderBy: { timestamp: 'asc' },
            },
          },
        },
        aiSuggestion: true,
        messages: {
          where: req.user?.role === 'aluno' ? { isInternal: false } : undefined,
          orderBy: { createdAt: 'asc' },
          include: { attachments: true },
        },
      },
    })

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' })
    }

    if (req.user?.role === 'aluno' && ticket.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem acesso a este chamado' })
    }

    res.json({
      ...ticket,
      slaStatus: currentSla(ticket),
      tags: JSON.parse(ticket.tags || '[]'),
    })
  } catch (error) {
    console.error('Erro ao buscar chamado:', error)
    res.status(500).json({ error: 'Erro ao buscar chamado' })
  }
})

// Create new ticket
ticketRouter.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, category, priority, studentId, tags, conversationId } = req.body

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Título, descrição e categoria são obrigatórios' })
    }

    const effectiveStudentId = req.user?.role === 'aluno' ? req.user.id : studentId
    if (!effectiveStudentId || !await prisma.student.findUnique({ where: { id: effectiveStudentId } })) {
      return res.status(400).json({ error: 'Informe um aluno cadastrado para abrir o chamado' })
    }
    if (conversationId && !await prisma.conversation.findFirst({ where: { id: conversationId, studentId: effectiveStudentId } })) {
      return res.status(400).json({ error: 'A conversa não pertence ao aluno do chamado' })
    }

    // Calculate ticket number
    const maxTicket = await prisma.ticket.findFirst({
      orderBy: { number: 'desc' },
    })
    const nextNumber = (maxTicket?.number || 1050) + 1

    // SLA calculation based on priority
    // Real AI Analysis based on knowledge base & content
    const aiAnalysis = await aiService.analyzeTicket(title, description, category)

    const finalPriority = priority || aiAnalysis.suggestedPriority
    const rules = await prisma.sLARule.findMany({ where: { active: true, priority: finalPriority }, orderBy: { updatedAt: 'desc' } })
    const rule = rules.find(r => r.category === category.toLowerCase()) || rules.find(r => !r.category)
    const slaHours = rule?.resolutionHours ?? (finalPriority === 'critica' ? 2 : finalPriority === 'alta' ? 4 : finalPriority === 'media' ? 24 : 72)
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000)

    const createdTicket = await prisma.ticket.create({
      data: {
        number: nextNumber,
        title,
        description,
        category: category.toLowerCase(),
        priority: finalPriority,
        status: 'aberto',
        studentId: effectiveStudentId,
        conversationId: conversationId || undefined,
        slaDeadline,
        slaStatus: 'ok',
        tags: JSON.stringify(tags || [category.toLowerCase()]),
        aiSuggestion: {
          create: {
            intent: aiAnalysis.intent,
            category: category.toLowerCase(),
            priority: finalPriority,
            summary: aiAnalysis.summary,
            confidence: aiAnalysis.confidence,
            recommendation: aiAnalysis.recommendation,
            sentiment: aiAnalysis.sentiment,
          },
        },
        messages: {
          create: {
            senderId: effectiveStudentId,
            senderName: req.user?.name || 'Esther Rodrigues',
            senderRole: req.user?.role || 'aluno',
            content: description,
            isInternal: false,
          },
        },
      },
      include: {
        student: true,
        attendant: { select: staffSelect },
        aiSuggestion: true,
        messages: true,
      },
    })

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        userId: req.user?.id,
        userName: req.user?.name || 'Aluno',
        userRole: req.user?.role || 'aluno',
        action: 'ticket.created',
        resource: 'Chamado',
        resourceId: `#${nextNumber}`,
        details: `Chamado "${title}" aberto na categoria ${category}`,
      },
    })

    res.status(201).json({
      ...createdTicket,
      tags: JSON.parse(createdTicket.tags || '[]'),
    })
  } catch (error) {
    console.error('Erro ao criar chamado:', error)
    res.status(500).json({ error: 'Erro interno ao criar chamado' })
  }
})

// Update ticket status / assignment / priority
ticketRouter.patch('/:id', authenticateToken, requireRole(['asa', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const { status, priority, assignedTo, category, tags } = req.body
    if (status !== undefined && !['aberto', 'em_atendimento', 'aguardando_aluno', 'resolvido', 'fechado'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }
    if (priority !== undefined && !['baixa', 'media', 'alta', 'critica'].includes(priority)) {
      return res.status(400).json({ error: 'Prioridade inválida' })
    }
    if (assignedTo && !await prisma.user.findFirst({ where: { id: assignedTo, role: { in: ['asa', 'admin'] }, status: 'ativo' } })) {
      return res.status(400).json({ error: 'Selecione um atendente ativo da equipe ASA ou administração' })
    }

    const existingTicket = await prisma.ticket.findUnique({ where: { id } })
    if (!existingTicket) {
      return res.status(404).json({ error: 'Chamado não encontrado' })
    }

    const dataToUpdate: any = {}
    if (status && status !== existingTicket.status) {
      dataToUpdate.status = status
      dataToUpdate.slaStatus = ['resolvido', 'fechado'].includes(existingTicket.status) && ['resolvido', 'fechado'].includes(status)
        ? existingTicket.slaStatus
        : currentSla({ ...existingTicket, status: 'aberto' })
    }
    if (priority) dataToUpdate.priority = priority
    if (assignedTo !== undefined) dataToUpdate.assignedTo = assignedTo
    if (category) dataToUpdate.category = category
    if (tags) dataToUpdate.tags = JSON.stringify(tags)

    const updated = await prisma.$transaction(async tx => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: dataToUpdate,
        include: {
          student: true,
          attendant: { select: staffSelect },
          aiSuggestion: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { attachments: true },
          },
        },
      })

      // Audit log
      await tx.auditEvent.create({
        data: {
          userId: req.user?.id,
          userName: req.user?.name || 'Operador ASA',
          userRole: req.user?.role || 'asa',
          action: 'ticket.updated',
          resource: 'Chamado',
          resourceId: `#${ticket.number}`,
          details: JSON.stringify({ ...dataToUpdate, previousStatus: existingTicket.status }),
        },
      })
      return ticket
    })

    res.json({
      ...updated,
      slaStatus: currentSla(updated),
      tags: JSON.parse(updated.tags || '[]'),
    })
  } catch (error) {
    console.error('Erro ao atualizar chamado:', error)
    res.status(500).json({ error: 'Erro ao atualizar chamado' })
  }
})

// Add message to ticket
ticketRouter.post('/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const { content, isInternal, attachments } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' })
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } })
    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' })
    }

    const senderRole = req.user?.role || 'aluno'
    if (senderRole === 'aluno' && ticket.studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Você não tem acesso a este chamado' })
    }
    const senderId = req.user?.id || (senderRole === 'aluno' ? ticket.studentId : 'asa-01')
    const senderName = req.user?.name || (senderRole === 'aluno' ? 'Aluno' : 'Atendente ASA')

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId,
        senderName,
        senderRole,
        content,
        isInternal: senderRole === 'aluno' ? false : Boolean(isInternal),
        attachments: attachments && attachments.length > 0 ? {
          create: attachments.map((att: any) => ({
            name: att.name,
            size: String(att.size || '1MB'),
            type: att.type || 'application/pdf',
            url: att.url || '#',
          })),
        } : undefined,
      },
      include: {
        attachments: true,
      },
    })

    // If attendant responds, transition from 'aberto' to 'em_atendimento' or 'aguardando_aluno'
    if (senderRole !== 'aluno' && ticket.status === 'aberto') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'em_atendimento' },
      })
    }

    res.status(201).json(message)
  } catch (error) {
    console.error('Erro ao enviar mensagem no chamado:', error)
    res.status(500).json({ error: 'Erro ao enviar mensagem' })
  }
})
