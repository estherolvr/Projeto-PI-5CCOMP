import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'
import { aiService } from '../services/ai.service'
import { AttachmentError, receiveTicketFiles, storeTicketFiles, removeTicketFiles, type StoredTicketFile } from '../services/ticket-attachments'
import { r2Service } from '../services/r2.service'
import { assignedSlaPolicies, normalizeSlaCategory, resolveSlaPolicy, type SlaPolicy } from '../services/ticket-sla'
import { liveSlaStatus } from '../services/admin-metrics'
import { withTicketCreationLock } from '../services/ticket-creation'
import { publicChatMessage } from '../services/chat-attachments'

export const ticketRouter = Router()

const staffSelect = { id: true, name: true, email: true, avatar: true, department: true }
function currentSla(ticket: { status: string; slaDeadline: Date; slaStatus: string }) {
  if (['resolvido', 'fechado'].includes(ticket.status)) return ticket.slaStatus
  return liveSlaStatus(ticket)
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
      conversation: ticket.conversation ? { ...ticket.conversation, messages: ticket.conversation.messages.map(publicChatMessage) } : null,
      slaStatus: currentSla(ticket),
      tags: JSON.parse(ticket.tags || '[]'),
    })
  } catch (error) {
    console.error('Erro ao buscar chamado:', error)
    res.status(500).json({ error: 'Erro ao buscar chamado' })
  }
})

// Create ticket, opening message and attachment metadata atomically.
ticketRouter.post('/', authenticateToken, receiveTicketFiles, async (req: AuthenticatedRequest, res) => {
  let stored: StoredTicketFile[] = []
  let committed = false
  try {
    const { title, description, category, priority, studentId, conversationId } = req.body
    if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim() || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ error: 'Título, descrição e categoria são obrigatórios' })
    }
    if (priority && !['baixa', 'media', 'alta', 'critica'].includes(priority)) return res.status(400).json({ error: 'Prioridade inválida' })
    if (req.body.attachments) return res.status(400).json({ error: 'Envie os arquivos pelo campo files; URLs de anexos não são aceitas.' })
    let tags = req.body.tags
    if (typeof tags === 'string') { try { tags = JSON.parse(tags) } catch { return res.status(400).json({error:'Tags inválidas.'}) } }
    if (tags !== undefined && (!Array.isArray(tags) || tags.some(t => typeof t !== 'string'))) return res.status(400).json({error:'Tags inválidas.'})
    const effectiveStudentId = req.user?.role === 'aluno' ? req.user.id : studentId
    if (!effectiveStudentId || !await prisma.student.findUnique({ where: { id: effectiveStudentId } })) return res.status(400).json({ error: 'Informe um aluno cadastrado para abrir o chamado' })
    if (conversationId && !await prisma.conversation.findFirst({ where: { id: conversationId, studentId: effectiveStudentId } })) return res.status(400).json({ error: 'A conversa não pertence ao aluno do chamado' })

    stored = await storeTicketFiles(req.files as Express.Multer.File[])
    const aiAnalysis = await aiService.analyzeTicket(title, description, category)
    const finalPriority = priority || aiAnalysis.suggestedPriority
    const rules = await prisma.sLARule.findMany({ where: { active: true, priority: finalPriority }, orderBy: { updatedAt: 'desc' } })
    const ticketCreatedAt = new Date()
    const slaPolicy = resolveSlaPolicy(finalPriority, category, rules, ticketCreatedAt)
    const slaDeadline = new Date(slaPolicy.resolutionDeadline)
    let createdTicket: any
    // A unique protocol race must not discard a valid student submission.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        createdTicket = await withTicketCreationLock(() => prisma.$transaction(async tx => {
          const maxTicket = await tx.ticket.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
          const nextNumber = (maxTicket?.number || 1050) + 1
          const ticket = await tx.ticket.create({
            data: {
              number: nextNumber, title: title.trim(), description: description.trim(), category: category.toLowerCase(),
              priority: finalPriority, status: 'aberto', studentId: effectiveStudentId,
              conversationId: conversationId || undefined, createdAt: ticketCreatedAt, slaDeadline, slaStatus: 'ok',
              tags: JSON.stringify(tags || [category.toLowerCase()]),
              aiSuggestion: { create: { intent: aiAnalysis.intent, category: category.toLowerCase(), priority: finalPriority,
                summary: aiAnalysis.summary, confidence: aiAnalysis.confidence, recommendation: aiAnalysis.recommendation, sentiment: aiAnalysis.sentiment } },
              messages: { create: { senderId: req.user!.id, senderName: req.user!.name, senderRole: req.user!.role,
                content: description.trim(), isInternal: false, createdAt: ticketCreatedAt, attachments: { create: stored } } },
            },
            include: { student: true, attendant: { select: staffSelect }, aiSuggestion: true, messages: { include: { attachments: true } } },
          })
          await tx.auditEvent.create({ data: { userId: req.user?.id, userName: req.user?.name || 'Aluno', userRole: req.user?.role || 'aluno',
            action: 'ticket.created', resource: 'Chamado', resourceId: `#${nextNumber}`, details: JSON.stringify({title,category,sla:slaPolicy}) } })
          return ticket
        }))
        committed = true
        break
      } catch (error: any) {
        if (attempt === 2 || !['P2002', 'P2034'].includes(error.code)) throw error
      }
    }
    res.status(201).json({ ...createdTicket, tags: JSON.parse(createdTicket.tags || '[]') })
  } catch (error) {
    if (!committed) await removeTicketFiles(stored)
    if (error instanceof AttachmentError) return res.status(error.status).json({error:error.message})
    console.error('Erro ao criar chamado:', error)
    res.status(500).json({ error: 'Erro interno ao criar chamado' })
  }
})

// Attachments are private: every download checks ticket ownership and internal-note visibility.
ticketRouter.get('/:id/attachments/:attachmentId/download', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: String(req.params.attachmentId) }, include: { message: { include: { ticket: true } } } })
    if (!attachment || attachment.message.ticketId !== String(req.params.id)) return res.status(404).json({error:'Anexo não encontrado.'})
    if (req.user?.role === 'aluno' && (attachment.message.ticket.studentId !== req.user.id || attachment.message.isInternal)) return res.status(403).json({error:'Você não tem acesso a este anexo.'})
    if (!attachment.url.startsWith('r2://tickets/')) return res.status(404).json({error:'Arquivo original não está disponível.'})
    if (!r2Service.isConfigured()) return res.status(503).json({error:'Armazenamento de anexos indisponível.'})
    const file = await r2Service.getFile(attachment.url.slice('r2://'.length))
    if (!file) return res.status(404).json({error:'Arquivo original não encontrado.'})
    res.setHeader('Content-Type', attachment.type)
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(file.buffer)
  } catch { res.status(503).json({error:'Não foi possível baixar o anexo. Tente novamente.'}) }
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
    if (category !== undefined && (typeof category !== 'string' || !category.trim() || category.length > 100)) return res.status(400).json({ error: 'Categoria inválida' })
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
    if (category) dataToUpdate.category = normalizeSlaCategory(category)
    if (tags) dataToUpdate.tags = JSON.stringify(tags)

    let slaAssignment: SlaPolicy | undefined
    const effectivePriority = priority || existingTicket.priority
    const effectiveCategory = category ? normalizeSlaCategory(category) : existingTicket.category
    if (!['resolvido', 'fechado'].includes(status || existingTicket.status)
      && (effectivePriority !== existingTicket.priority || effectiveCategory !== existingTicket.category)) {
      const rules = await prisma.sLARule.findMany({ where: { active: true, priority: effectivePriority } })
      slaAssignment = resolveSlaPolicy(effectivePriority, effectiveCategory, rules, existingTicket.createdAt)
      const firstReply = await prisma.ticketMessage.findFirst({ where: { ticketId: id, senderRole: { in: ['asa', 'admin'] }, isInternal: false, createdAt: { gt: existingTicket.createdAt } } })
      if (firstReply) {
        const audits = await prisma.auditEvent.findMany({ where: { resourceId: { in: [id, `#${existingTicket.number}`] }, action: { in: ['ticket.created', 'ticket.updated'] } }, orderBy: { createdAt: 'asc' } })
        const policies = assignedSlaPolicies(audits)
        const previous = policies.get(id) || policies.get(`#${existingTicket.number}`)
        // An already measured first response must not change when reprioritizing.
        slaAssignment.firstResponseMinutes = previous?.firstResponseMinutes ?? null
        slaAssignment.firstResponseDeadline = previous?.firstResponseDeadline ?? null
      }
      dataToUpdate.slaDeadline = new Date(slaAssignment.resolutionDeadline)
      dataToUpdate.slaStatus = liveSlaStatus({ slaDeadline: dataToUpdate.slaDeadline })
    }

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
          details: JSON.stringify({ ...dataToUpdate, previousStatus: existingTicket.status, ...(slaAssignment ? { sla: slaAssignment } : {}) }),
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

// Add a persisted message and actual file bytes to a ticket.
ticketRouter.post('/:id/messages', authenticateToken, receiveTicketFiles, async (req: AuthenticatedRequest, res) => {
  let stored: StoredTicketFile[] = []
  let committed = false
  try {
    const id = String(req.params.id)
    const { content, isInternal, attachments } = req.body
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' })
    if (attachments) return res.status(400).json({ error: 'Envie arquivos pelo campo files; URLs de anexos não são aceitas.' })
    const ticket = await prisma.ticket.findUnique({ where: { id } })
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' })
    const senderRole = req.user?.role || 'aluno'
    if (senderRole === 'aluno' && ticket.studentId !== req.user?.id) return res.status(403).json({ error: 'Você não tem acesso a este chamado' })
    if (ticket.status === 'fechado') return res.status(409).json({error:'O chamado está fechado. Reabra-o antes de enviar uma resposta.'})
    stored = await storeTicketFiles(req.files as Express.Multer.File[])
    const message = await prisma.$transaction(async tx => {
      const created = await tx.ticketMessage.create({ data: {
        ticketId: id, senderId: req.user!.id, senderName: req.user?.name || 'Usuário', senderRole,
        content: content.trim(), isInternal: senderRole === 'aluno' ? false : isInternal === true || isInternal === 'true',
        attachments: { create: stored },
      }, include: { attachments: true } })
      await tx.ticket.update({where:{id},data:{updatedAt:new Date(),...(senderRole !== 'aluno' && ticket.status === 'aberto' && !created.isInternal ? {status:'em_atendimento'} : {})}})
      return created
    })
    committed = true
    res.status(201).json(message)
  } catch (error) {
    if (!committed) await removeTicketFiles(stored)
    if (error instanceof AttachmentError) return res.status(error.status).json({error:error.message})
    console.error('Erro ao enviar mensagem no chamado:', error)
    res.status(500).json({ error: 'Erro ao enviar mensagem' })
  }
})
