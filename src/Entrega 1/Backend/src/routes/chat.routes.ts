import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'
import { aiService } from '../services/ai.service'
import { r2Service } from '../services/r2.service'
import { scheduleBackground } from '../services/runtime-context'
import { ChatAttachmentError, chatUpload, publicChatMessage, recentAttachmentContexts, removeChatAttachments, saveChatAttachments, storedChatAttachments, type StoredChatAttachment } from '../services/chat-attachments'

export const chatRouter = Router()

// List conversations for authenticated student
chatRouter.get('/conversations', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: req.user?.role === 'aluno' ? { studentId: req.user.id } : {},
      take: 100,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, ra: true } },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    const formatted = conversations.map(c => ({
      id: c.id,
      title: c.title,
      studentId: c.studentId,
      student: c.student,
      status: 'ativo',
      lastMessage: c.messages[0]?.content || 'Nova conversa',
      lastMessageTime: c.messages[0]?.timestamp || c.createdAt,
      unread: false,
      aiHandled: true,
    }))

    res.json(formatted)
  } catch (error) {
    console.error('Erro ao listar conversas:', error)
    res.status(500).json({ error: 'Erro ao buscar conversas' })
  }
})

// Create new conversation
chatRouter.post('/conversations', authenticateToken, requireRole(['aluno']), async (req: AuthenticatedRequest, res) => {
  try {
    const studentId = req.user!.id
    if (!await prisma.student.findUnique({ where: { id: studentId } })) return res.status(404).json({ error: 'Cadastro de aluno não encontrado.' })

    const { title } = req.body

    const conversation = await prisma.conversation.create({
      data: {
        studentId,
        title: title || 'Nova Conversa com iÁlvaro',
        messages: {
          create: {
            role: 'assistant',
            content: 'Olá! Sou o iÁlvaro, o assistente inteligente da Central de Atendimento ao Aluno da FECAP. Como posso te orientar hoje?',
            actions: JSON.stringify([
              { label: 'Documentos & Atestados', action: 'documentos' },
              { label: 'Financeiro & Boletos', action: 'financeiro' },
              { label: 'Bolsas & FIES/Prouni', action: 'bolsas' },
              { label: 'Abrir Chamado', action: 'novo-chamado' },
            ]),
          },
        },
      },
      include: {
        messages: true,
      },
    })

    res.status(201).json({
      ...conversation,
      messages: conversation.messages.map(publicChatMessage),
    })
  } catch (error: any) {
    console.error('Erro ao criar conversa:', error)
    res.status(500).json({ error: error.message || 'Erro ao criar conversa' })
  }
})

// Get single conversation by ID
chatRouter.get('/conversations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    if (req.user?.role === 'aluno' && conversation.studentId !== req.user.id) return res.status(403).json({ error: 'Você não tem acesso a esta conversa.' })

    const feedbacks = req.user?.role === 'aluno' ? await prisma.aIFeedback.findMany({
      where: { studentId: req.user.id, conversationId: id, messageId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { messageId: true, type: true, comment: true, createdAt: true },
    }) : []
    const feedbackByMessage = new Map<string, typeof feedbacks[number]>()
    for (const feedback of feedbacks) if (feedback.messageId && !feedbackByMessage.has(feedback.messageId)) feedbackByMessage.set(feedback.messageId, feedback)

    res.json({
      ...conversation,
      messages: conversation.messages.map(message => ({ ...publicChatMessage(message), feedback: feedbackByMessage.get(message.id) || null })),
    })
  } catch (error) {
    console.error('Erro ao buscar conversa:', error)
    res.status(500).json({ error: 'Erro ao buscar conversa' })
  }
})

// Original bytes are served only after conversation ownership / staff authorization.
chatRouter.get('/conversations/:id/messages/:messageId/attachments/:attachmentId/download', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada.' })
    if (req.user?.role === 'aluno' && conversation.studentId !== req.user.id) return res.status(403).json({ error: 'Você não tem acesso a esta conversa.' })
    const message = await prisma.chatMessage.findFirst({ where: { id: String(req.params.messageId), conversationId: id, role: 'user' } })
    const attachment = message && storedChatAttachments(message.actions).find(a => a.id === String(req.params.attachmentId))
    if (!attachment || attachment.storageKey !== `chat-attachments/${id}/${attachment.id}/original`) return res.status(404).json({ error: 'Anexo não encontrado.' })
    const file = await r2Service.getFile(attachment.storageKey)
    if (!file) return res.status(404).json({ error: 'Arquivo não encontrado no armazenamento.' })
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, no-store')
    return res.send(file.buffer)
  } catch {
    res.status(503).json({ error: 'Não foi possível baixar o anexo. Tente novamente.' })
  }
})

// Send a message and optional documents, then persist both sides atomically.
chatRouter.post('/conversations/:id/messages', authenticateToken, requireRole(['aluno']), chatUpload, async (req: AuthenticatedRequest, res) => {
  let stored: StoredChatAttachment[] = []
  let persisted = false
  try {
    const id = String(req.params.id)
    const files = (req.files || []) as Express.Multer.File[]
    const userTimestamp = new Date()
    if (req.body?.content !== undefined && typeof req.body.content !== 'string') return res.status(400).json({ error: 'A mensagem deve ser um texto.' })
    const content = (req.body?.content || '').trim() || (files.length ? 'Analise os arquivos anexados.' : '')
    if (!content || content.length > 10000) return res.status(400).json({ error: 'Informe uma mensagem de até 10 mil caracteres ou anexe um arquivo.' })
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: [{ timestamp: 'desc' }, { id: 'desc' }], take: 8 } },
    })
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada.' })
    if (conversation.studentId !== req.user?.id) return res.status(403).json({ error: 'Você não tem acesso a esta conversa.' })
    const student = await prisma.student.findUnique({ where: { id: conversation.studentId } })
    const upload = await saveChatAttachments(id, files)
    stored = upload.attachments
    const recentMessages = [...conversation.messages].reverse()
    const attachmentContexts = await recentAttachmentContexts(recentMessages, upload.contexts)
    const history = recentMessages.map(m => ({ role: m.role, content: m.content }))
    const ragResult = await aiService.generateChatResponse(content, history, student ? {
      id: student.id, name: student.name, email: student.email, ra: student.ra,
      course: student.course, semester: student.semester, period: student.period,
    } : undefined, attachmentContexts)
    let finalContent = ragResult.provider === 'local'
      ? '**IA generativa indisponível.** A orientação abaixo usa somente os trechos disponíveis na base de conhecimento.\n\n' + ragResult.content
      : ragResult.content
    if (ragResult.sources.length) {
      finalContent += `\n\n---\n**Fontes Consultadas:**\n${ragResult.sources.map(source => `• 📄 **${source.title}** (${source.category})`).join('\n')}`
    }
    const result = await prisma.$transaction(async tx => {
      const userMessage = await tx.chatMessage.create({ data: {
        conversationId: id, role: 'user', content, timestamp: userTimestamp,
        actions: stored.length ? JSON.stringify(stored.map(attachment => ({ action: 'download_attachment', label: attachment.name, attachment }))) : null,
      } })
      const aiMessage = await tx.chatMessage.create({ data: {
        conversationId: id, role: 'assistant', content: finalContent,
        timestamp: new Date(Math.max(Date.now(), userTimestamp.getTime() + 1)),
        actions: ragResult.actions.length ? JSON.stringify(ragResult.actions) : null,
      } })
      await tx.conversation.update({ where: { id }, data: {
        ...(conversation.messages.length <= 2 ? { title: content.slice(0, 32) + (content.length > 32 ? '...' : '') } : {}),
        updatedAt: new Date(),
      } })
      return { userMessage: publicChatMessage(userMessage), aiMessage: publicChatMessage(aiMessage) }
    })
    persisted = true
    if (r2Service.isConfigured()) {
      const synchronization = prisma.conversation.findUnique({ where: { id }, include: { messages: { orderBy: { timestamp: 'asc' } } } })
        .then(saved => saved ? r2Service.saveConversationSnapshot(id, conversation.studentId, {
          title: saved.title, messages: saved.messages.map(publicChatMessage), updatedAt: saved.updatedAt,
        }) : null).catch(() => { console.warn('Não foi possível sincronizar o snapshot da conversa no armazenamento.') })
      scheduleBackground(synchronization)
    }
    res.status(201).json(result)
  } catch (error) {
    if (!persisted) await removeChatAttachments(stored)
    const expected = error instanceof ChatAttachmentError
    res.status(expected ? error.status : 500).json({ error: expected ? error.message : 'Erro ao processar mensagem do chat. Tente novamente.' })
  }
})


/**
 * GET /api/chat/conversations/:id/r2-snapshot
 * Consulta ou restaura o snapshot oficial da conversa gravado no Cloudflare R2
 */
chatRouter.get('/conversations/:id/r2-snapshot', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    if (req.user?.role === 'aluno' && conversation.studentId !== req.user.id) return res.status(403).json({ error: 'Você não tem acesso a esta conversa.' })
    const studentId = conversation.studentId
    const snapshot = await r2Service.getConversationSnapshot(id, studentId)

    if (!snapshot) {
      return res.status(404).json({
        error: 'Snapshot R2 ainda não disponível ou Cloudflare R2 aguardando credenciais.',
        configured: r2Service.isConfigured(),
      })
    }

    res.json({
      source: 'cloudflare-r2',
      snapshot,
    })
  } catch (error: any) {
    console.error('Erro ao buscar snapshot R2:', error)
    res.status(500).json({ error: error.message || 'Erro ao consultar Cloudflare R2' })
  }
})


// Send feedback on AI response
chatRouter.post('/feedback', authenticateToken, requireRole(['aluno']), async (req: AuthenticatedRequest, res) => {
  try {
    const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : ''
    const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : ''
    const type = req.body?.type
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : ''
    if (!conversationId) return res.status(400).json({ error: 'A conversa é obrigatória.' })
    if (comment.length > 1000) return res.status(400).json({ error: 'O comentário deve ter no máximo 1000 caracteres.' })

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { studentId: true } })
    if (!conversation || conversation.studentId !== req.user!.id) return res.status(403).json({ error: 'Você não tem acesso a esta conversa.' })
    if (!messageId || !['positive', 'negative'].includes(type)) {
      return res.status(400).json({ error: 'Resposta e avaliação são obrigatórias.' })
    }
    const message = await prisma.chatMessage.findFirst({ where: { id: messageId, conversationId, role: 'assistant' }, select: { id: true, content: true } })
    if (!message) return res.status(404).json({ error: 'Resposta do assistente não encontrada.' })
    const student = await prisma.student.findUnique({ where: { id: req.user!.id }, select: { name: true } })
    if (!student) return res.status(404).json({ error: 'Cadastro de aluno não encontrado.' })

    const existing = await prisma.aIFeedback.findFirst({ where: { studentId: req.user!.id, messageId }, orderBy: { createdAt: 'desc' } })
    const data = {
      studentId: req.user!.id,
      studentName: student.name,
      conversationId,
      messageId,
      type,
      snippet: message.content.slice(0, 1200),
      comment: comment || null,
      rating: type === 'positive' ? 5 : 1,
    }
    const feedback = existing
      ? await prisma.aIFeedback.update({ where: { id: existing.id }, data })
      : await prisma.aIFeedback.create({ data })

    res.status(existing ? 200 : 201).json(feedback)
  } catch (error: any) {
    console.error('Erro ao salvar feedback:', error)
    res.status(500).json({ error: 'Erro ao registrar feedback' })
  }
})
