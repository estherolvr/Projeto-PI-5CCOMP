import { aiService } from '../services/ai.service'
import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { ACTIVE_TICKET_STATUSES, COMPLETED_TICKET_STATUSES, liveSlaStatus, metricTicketSelect, reportPeriod, statusAuditQuery, ticketAnalytics } from '../services/admin-metrics'
import { operationalHealth, probeGeminiGeneration, probeGeminiModel, publicIntegrationConfig } from '../services/admin-health'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'
import { assignedSlaPolicies, evaluateTicketSla, validateSlaRule } from '../services/ticket-sla'
import { createInstitutionalUser, findProvisionedUserByEmail, removeProvisionedUser, requiresSupabaseProvisioning, SupabaseProvisioningError } from '../services/supabase-admin'

export const adminRouter = Router()
adminRouter.use(authenticateToken, requireRole(['admin', 'asa']))

const publicUserSelect = {
  id: true, name: true, email: true, role: true, avatar: true,
  department: true, status: true, lastAccess: true, createdAt: true,
} as const

const publicStudentSelect = {
  id: true, name: true, ra: true, email: true, course: true, semester: true,
  period: true, status: true, phone: true, createdAt: true, updatedAt: true,
} as const

adminRouter.get('/health', async (_req, res) => {
  res.json(await operationalHealth(() => prisma.$queryRaw`SELECT 1`))
})

adminRouter.get('/health/gemini', async (_req, res) => {
  const model = typeof _req.query.model === 'string' ? _req.query.model : undefined
  const result = await probeGeminiModel(process.env, 10_000, model)
  res.status(result.available ? 200 : 502).json(result)
})

adminRouter.post('/health/gemini/generation-test', requireRole(['admin']), async (_req, res) => {
  const model = typeof _req.body?.model === 'string' ? _req.body.model : undefined
  const result = await probeGeminiGeneration(process.env, 20_000, model)
  res.status(result.available ? 200 : 502).json(result)
})

// SLA Rules
adminRouter.get('/sla-rules', authenticateToken, async (req, res) => {
  try {
    const rules = await prisma.sLARule.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(rules)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar regras de SLA' })
  }
})

adminRouter.post('/sla-rules', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const data = validateSlaRule(req.body)
    if (!data) return res.status(400).json({ error: 'Informe nome, prioridade e prazos inteiros positivos. A primeira resposta deve ocorrer até o prazo de resolução (máximo 8760 horas).' })
    const rule = await prisma.sLARule.create({ data })
    res.status(201).json(rule)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar regra de SLA' })
  }
})

adminRouter.put('/sla-rules/:id', requireRole(['admin']), async (req, res) => {
  try {
    const id = String(req.params.id)
    const existing = await prisma.sLARule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Regra de SLA não encontrada.' })
    const data = validateSlaRule({ ...existing, ...req.body })
    if (!data) return res.status(400).json({ error: 'Informe prazos válidos; a primeira resposta deve ocorrer até a resolução.' })
    res.json(await prisma.sLARule.update({ where: { id }, data }))
  } catch { res.status(500).json({ error: 'Não foi possível atualizar a regra de SLA.' }) }
})

adminRouter.get('/sla-monitor', async (_req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { status: { in: ACTIVE_TICKET_STATUSES } },
      select: { id: true, number: true, title: true, category: true, priority: true, status: true, createdAt: true, slaDeadline: true,
        student: { select: { name: true } }, attendant: { select: { name: true } },
        messages: { where: { senderRole: { in: ['asa', 'admin'] }, isInternal: false }, select: { createdAt: true, senderRole: true, isInternal: true } } },
      orderBy: { slaDeadline: 'asc' },
    })
    const audits = tickets.length ? await prisma.auditEvent.findMany({ where: { action: { in: ['ticket.created', 'ticket.updated'] }, resourceId: { in: tickets.flatMap(t => [t.id, `#${t.number}`]) } }, select: { resourceId: true, details: true }, orderBy: { createdAt: 'asc' } }) : []
    const policies = assignedSlaPolicies(audits)
    const now = new Date()
    res.json(tickets.map(({ messages, ...ticket }) => ({ ...ticket, ...evaluateTicketSla({ ...ticket, messages }, policies.get(ticket.id) || policies.get(`#${ticket.number}`), now) })))
  } catch { res.status(500).json({ error: 'Não foi possível consultar os prazos dos chamados.' }) }
})

// Automations
adminRouter.get('/automations', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const automations = await prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } })
    const formatted = automations.map(a => ({
      ...a,
      trigger: JSON.parse(a.trigger || '{}'),
      conditions: JSON.parse(a.conditions || '[]'),
      actions: JSON.parse(a.actions || '[]'),
    }))
    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar automações' })
  }
})

adminRouter.post('/automations', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, description, trigger, conditions, actions, active } = req.body
    const rule = await prisma.automationRule.create({
      data: {
        name,
        description,
        trigger: JSON.stringify(trigger || {}),
        conditions: JSON.stringify(conditions || []),
        actions: JSON.stringify(actions || []),
        active: active !== undefined ? Boolean(active) : true,
      },
    })
    res.status(201).json({
      ...rule,
      trigger: JSON.parse(rule.trigger),
      conditions: JSON.parse(rule.conditions),
      actions: JSON.parse(rule.actions),
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar automação' })
  }
})

// Audit Logs
adminRouter.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { action, userRole, limit } = req.query
    const where: any = {}
    if (action) where.action = String(action)
    if (userRole) where.userRole = String(userRole)

    const logs = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, Math.max(1, Number.parseInt(String(limit)) || 50)),
    })
    res.json(logs)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' })
  }
})

// AI Prompts
adminRouter.get('/prompts', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const prompts = await prisma.aIPrompt.findMany({ orderBy: { updatedAt: 'desc' } })
    res.json(prompts)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar prompts de IA' })
  }
})

adminRouter.put('/prompts/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const id = String(req.params.id)
    const { content, version, status, name, description } = req.body

    const dataToUpdate: any = {}
    if (content) dataToUpdate.content = content
    if (version) dataToUpdate.version = version
    if (status) dataToUpdate.status = status
    if (name) dataToUpdate.name = name
    if (typeof description === 'string') dataToUpdate.description = description

    const prompt = await prisma.aIPrompt.update({
      where: { id },
      data: dataToUpdate,
    })
    res.json(prompt)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar prompt' })
  }
})

function publicHttpsUrl(value: unknown, field: string) {
  try {
    const url = new URL(String(value || '').trim())
    if (url.protocol !== 'https:') throw new Error()
    return url.toString()
  } catch {
    throw new Error(`${field} deve ser uma URL HTTPS válida.`)
  }
}

// Banners shown on the authenticated student home.
adminRouter.get('/banners', authenticateToken, requireRole(['admin']), async (_req, res) => {
  try {
    const records = await prisma.aIPrompt.findMany({ where: { version: 'home-banner-v1' }, orderBy: { createdAt: 'desc' } })
    const banners = records.map(record => {
      const content = JSON.parse(record.content) as { imageUrl: string; linkUrl: string; sortOrder?: number }
      return { id: record.id, title: record.name, description: record.description || null, imageUrl: content.imageUrl, linkUrl: content.linkUrl, sortOrder: content.sortOrder || 0, active: record.status === 'ativo', updatedAt: record.updatedAt }
    }).sort((a, b) => a.sortOrder - b.sortOrder)
    res.json(banners)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar banners da Home.' })
  }
})

adminRouter.post('/banners', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const title = String(req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Informe o título do banner.' })
    const imageUrl = publicHttpsUrl(req.body.imageUrl, 'A imagem')
    const linkUrl = publicHttpsUrl(req.body.linkUrl, 'O link de destino')
    const sortOrder = Number.isInteger(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0
    const record = await prisma.aIPrompt.create({ data: {
      name: title,
      description: String(req.body.description || '').trim(),
      content: JSON.stringify({ imageUrl, linkUrl, sortOrder }),
      version: 'home-banner-v1',
      status: req.body.active !== false ? 'ativo' : 'inativo',
      author: 'Administração',
    } })
    res.status(201).json({ id: record.id, title: record.name, description: record.description || null, imageUrl, linkUrl, sortOrder, active: record.status === 'ativo', updatedAt: record.updatedAt })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Não foi possível criar o banner.' })
  }
})

adminRouter.put('/banners/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const title = String(req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Informe o título do banner.' })
    const imageUrl = publicHttpsUrl(req.body.imageUrl, 'A imagem')
    const linkUrl = publicHttpsUrl(req.body.linkUrl, 'O link de destino')
    const sortOrder = Number.isInteger(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0
    const record = await prisma.aIPrompt.update({ where: { id: String(req.params.id), version: 'home-banner-v1' }, data: {
      name: title,
      description: String(req.body.description || '').trim(),
      content: JSON.stringify({ imageUrl, linkUrl, sortOrder }),
      status: req.body.active !== false ? 'ativo' : 'inativo',
    } })
    res.json({ id: record.id, title: record.name, description: record.description || null, imageUrl, linkUrl, sortOrder, active: record.status === 'ativo', updatedAt: record.updatedAt })
  } catch (error: any) {
    res.status(error?.code === 'P2025' ? 404 : 400).json({ error: error?.code === 'P2025' ? 'Banner não encontrado.' : error instanceof Error ? error.message : 'Não foi possível atualizar o banner.' })
  }
})

adminRouter.delete('/banners/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await prisma.aIPrompt.delete({ where: { id: String(req.params.id), version: 'home-banner-v1' } })
    res.status(204).end()
  } catch (error: any) {
    res.status(error?.code === 'P2025' ? 404 : 500).json({ error: error?.code === 'P2025' ? 'Banner não encontrado.' : 'Não foi possível excluir o banner.' })
  }
})

// Integrations
adminRouter.get('/integrations', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const integrations = await prisma.integration.findMany({ orderBy: { createdAt: 'asc' } })
    const formatted = integrations.map(i => ({
      ...i,
      config: publicIntegrationConfig(i.config),
      status: 'nao_verificado',
      recordedStatus: i.status,
      detail: 'Cadastro de integração. Conectividade e sincronização não verificadas.',
    }))
    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar integrações' })
  }
})

// Users (Equipe ASA e Admins)
adminRouter.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { role } = req.query
    const where: any = {}
    if (role) where.role = String(role)

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        department: true,
        status: true,
        lastAccess: true,
        createdAt: true,
        _count: {
          select: { assignedTickets: { where: { status: { in: ACTIVE_TICKET_STATUSES } } } },
        },
      },
      orderBy: { name: 'asc' },
    })
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' })
  }
})

// Notifications
adminRouter.get('/notifications', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar notificações' })
  }
})

adminRouter.patch('/notifications/read-all', authenticateToken, requireRole(['admin']), async (_req, res) => {
  try {const result=await prisma.notification.updateMany({where:{read:false},data:{read:true}});res.json(result)}
  catch {res.status(500).json({error:'Não foi possível marcar as notificações como lidas.'})}
})

adminRouter.patch('/notifications/:id/read', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const id = String(req.params.id)
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar notificação' })
  }
})


// ==========================================
// ADMIN DASHBOARD & REAL DATA INTEGRATIONS
// ==========================================

// Dashboard values are based on persisted records, with no sampling cap.
adminRouter.get('/dashboard-stats', authenticateToken, requireRole(['admin', 'asa']), async (_req, res) => {
  try {
    const now = new Date()
    const [totalStudents, totalAsa, activeAsa, appointmentsCount, users, tickets, auditEvents, statusAudits, health] = await Promise.all([
      prisma.student.count(),
      prisma.user.count({ where: { role: 'asa' } }),
      prisma.user.count({ where: { role: 'asa', status: 'ativo' } }),
      prisma.appointment.count(),
      prisma.user.findMany({
        where: { role: 'asa' },
        select: {
          ...publicUserSelect,
          _count: { select: { assignedTickets: { where: { status: { in: ACTIVE_TICKET_STATUSES } } } } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.ticket.findMany({ select: metricTicketSelect }),
      prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.auditEvent.findMany(statusAuditQuery),
      operationalHealth(() => prisma.$queryRaw`SELECT 1`),
    ])
    const categoryCounts: Record<string, number> = {}
    tickets.forEach(ticket => { categoryCounts[ticket.category] = (categoryCounts[ticket.category] || 0) + 1 })
    const categoryColors: Record<string, string> = {
      matricula: '#3b82f6', financeiro: '#10b981', academico: '#f59e0b', documentos: '#8b5cf6',
      infraestrutura: '#ec4899', cancelamento: '#ef4444', outros: '#64748b',
    }
    const analytics = ticketAnalytics(tickets, statusAudits, [], reportPeriod(7, now))
    const statusLabels: Record<string, string> = {
      operacional: 'Operacional', configurado: 'Configurado · não verificado',
      nao_configurado: 'Não configurado', indisponivel: 'Indisponível',
    }
    res.json({
      totalStudents, totalAsa, activeAsa, appointmentsCount,
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => ACTIVE_TICKET_STATUSES.includes(t.status)).length,
      resolvedTickets: tickets.filter(t => COMPLETED_TICKET_STATUSES.includes(t.status)).length,
      slaRiskTickets: tickets.filter(t => ACTIVE_TICKET_STATUSES.includes(t.status) && liveSlaStatus(t, now) !== 'ok').length,
      pieData: Object.entries(categoryCounts).map(([category, value]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1), value, color: categoryColors[category] || '#6366f1',
      })),
      chartData: analytics.chartData.map(point => ({ ...point, abertos: point.criados })),
      teamStatus: users.map(user => ({ ...user, tickets: user._count.assignedTickets, _count: undefined })),
      recentAuditEvents: auditEvents,
      systemHealth: health.checks.map(check => ({
        ...check, status: statusLabels[check.status],
        color: check.status === 'operacional' ? 'bg-green-500' : check.status === 'indisponivel' ? 'bg-red-500' : 'bg-amber-500',
      })),
      sampleCounts: analytics.sampleCounts,
    })
  } catch (error) {
    console.error('Erro ao buscar métricas da Central de Controle:', error)
    res.status(500).json({ error: 'Erro ao gerar indicadores do dashboard' })
  }
})

// Students Administration (Real List with Pagination & Filters)
adminRouter.get('/students', authenticateToken, requireRole(['admin', 'asa']), async (req, res) => {
  try {
    const { search, course, status, period, page = '1', limit = '20' } = req.query
    const pageNum = Math.max(1, parseInt(String(page)) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20))
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    if (course && course !== 'todos') where.course = String(course)
    if (status && status !== 'todos') where.status = String(status)
    if (period && period !== 'todos') where.period = String(period)

    if (search) {
      const q = String(search).toLowerCase()
      where.OR = [
        { name: { contains: q } },
        { ra: { contains: q } },
        { email: { contains: q } },
        { course: { contains: q } },
      ]
    }

    const [students, total, totalsByStatus, courseRows] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          ...publicStudentSelect,
          _count: { select: { tickets: true, appointments: true, conversations: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.student.count({ where }),
      prisma.student.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.student.findMany({ select: { course: true }, distinct: ['course'], orderBy: { course: 'asc' } }),
    ])

    res.json({
      students,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      summary: {
        total: totalsByStatus.reduce((sum, row) => sum + row._count._all, 0),
        regular: totalsByStatus.find(row => row.status === 'regular')?._count._all || 0,
        irregular: totalsByStatus.find(row => row.status === 'irregular')?._count._all || 0,
        trancado: totalsByStatus.find(row => row.status === 'trancado')?._count._all || 0,
      },
      courses: courseRows.map(row => row.course),
    })
  } catch (error) {
    console.error('Erro ao listar alunos no admin:', error)
    res.status(500).json({ error: 'Erro ao listar alunos' })
  }
})

// Create Student
adminRouter.post('/students', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  let provisionedUserId: string | null = null
  try {
    const { name, ra, email, course, semester, period, phone, status, password } = req.body
    if (![name, ra, email, course].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Nome, RA, e-mail e curso são obrigatórios' })
    }
    if ((period && !['manha', 'tarde', 'noite'].includes(period))
      || (status && !['regular', 'irregular', 'trancado'].includes(status))
      || (semester !== undefined && (!Number.isInteger(Number(semester)) || Number(semester) < 1))) {
      return res.status(400).json({ error: 'Período, situação ou semestre inválido.' })
    }
    if (requiresSupabaseProvisioning() && (typeof password !== 'string' || password.length < 8)) {
      return res.status(400).json({ error: 'Informe uma senha temporária com pelo menos 8 caracteres.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const duplicate = await prisma.student.findFirst({ where: { OR: [{ email: normalizedEmail }, { ra: ra.trim() }] }, select: { id: true } })
    if (duplicate) return res.status(409).json({ error: 'RA ou e-mail já cadastrado.' })

    if (requiresSupabaseProvisioning()) {
      provisionedUserId = await createInstitutionalUser(normalizedEmail, password, { name: name.trim(), role: 'aluno', ra: ra.trim() })
    }

    const student = await prisma.$transaction(async tx => {
      const created = await tx.student.create({ data: {
        name: name.trim(),
        ra: ra.trim(),
        email: normalizedEmail,
        course: course.trim(),
        semester: Number(semester) || 1,
        period: period || 'manha',
        phone: phone || null,
        status: status || 'regular',
      } })
      await tx.auditEvent.create({ data: {
        userId: req.user?.id || null,
        userName: req.user?.name || 'Administrador',
        userRole: req.user?.role || 'admin',
        action: 'CRIOU_ALUNO',
        resource: 'Student',
        resourceId: created.id,
        details: JSON.stringify({ name: created.name, ra: created.ra, course: created.course, authProvisioning: provisionedUserId ? 'created' : 'local-test' }),
        severity: 'info',
      } })
      return created
    })

    res.status(201).json({ ...student, authProvisioning: provisionedUserId ? 'created' : 'not_required' })
  } catch (error: any) {
    if (provisionedUserId) await removeProvisionedUser(provisionedUserId)
    if (error instanceof SupabaseProvisioningError) return res.status(error.statusCode).json({ error: error.message })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'RA ou e-mail já cadastrado.' })
    }
    console.error('Erro ao cadastrar aluno:', error)
    res.status(500).json({ error: 'Erro ao cadastrar aluno' })
  }
})

// Toggle Student Status
adminRouter.patch('/students/:id/status', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const { status } = req.body
    if (!['regular', 'irregular', 'trancado'].includes(status)) return res.status(400).json({ error: 'Status de aluno inválido' })

    const student = await prisma.student.update({
      where: { id },
      data: { status },
      select: publicStudentSelect,
    })

    await prisma.auditEvent.create({
      data: {
        userId: req.user?.id || null,
        userName: req.user?.name || 'Administrador',
        userRole: req.user?.role || 'admin',
        action: 'ALTEROU_STATUS_ALUNO',
        resource: 'Student',
        resourceId: student.id,
        details: JSON.stringify({ studentName: student.name, newStatus: status }),
        severity: 'info',
      },
    })

    res.json(student)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar status do estudante' })
  }
})

// Removes only unused student records. Records with service history must be deactivated instead.
adminRouter.delete('/students/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { tickets: true, appointments: true, conversations: true } } },
    })
    if (!student) return res.status(404).json({ error: 'Aluno não encontrado.' })
    if (Object.values(student._count).some(count => count > 0)) {
      return res.status(409).json({ error: 'Alunos com histórico devem ser desativados, não excluídos.' })
    }
    const authUserId = requiresSupabaseProvisioning() ? await findProvisionedUserByEmail(student.email) : null
    await prisma.$transaction(async tx => {
      await tx.student.delete({ where: { id: student.id } })
      await tx.auditEvent.create({ data: {
        userId: req.user?.id || null, userName: req.user?.name || 'Administrador', userRole: 'admin',
        action: 'EXCLUIU_ALUNO_SEM_HISTORICO', resource: 'Student', resourceId: student.id,
        details: JSON.stringify({ email: student.email, ra: student.ra }), severity: 'warning',
      } })
    })
    if (authUserId && !await removeProvisionedUser(authUserId)) {
      return res.status(502).json({ error: 'Cadastro acadêmico removido, mas o login precisa ser removido manualmente no Supabase.', removed: true })
    }
    return res.status(204).send()
  } catch (error) {
    if (error instanceof SupabaseProvisioningError) return res.status(error.statusCode).json({ error: error.message })
    console.error('Erro ao excluir aluno sem histórico:', error)
    return res.status(500).json({ error: 'Não foi possível excluir o aluno.' })
  }
})

// Create Staff User (ASA or Admin)
adminRouter.post('/users', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  let provisionedUserId: string | null = null
  try {
    const { name, email, password, role, department } = req.body
    if (![name, email].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' })
    }
    if (role && !['admin', 'asa'].includes(role)) return res.status(400).json({ error: 'Perfil de equipe inválido.' })
    if (requiresSupabaseProvisioning() && (typeof password !== 'string' || password.length < 8)) {
      return res.status(400).json({ error: 'Informe uma senha temporária com pelo menos 8 caracteres.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' })
    }
    if (requiresSupabaseProvisioning()) {
      provisionedUserId = await createInstitutionalUser(normalizedEmail, password, { name: name.trim(), role: role || 'asa' })
    }

    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: {
        name: name.trim(),
        email: normalizedEmail,
        password: '!supabase-auth-only!' + crypto.randomUUID(),
        role: role || 'asa',
        department: department || 'Atendimento ASA',
        status: 'ativo',
      }, select: publicUserSelect })
      await tx.auditEvent.create({ data: {
        userId: req.user?.id || null,
        userName: req.user?.name || 'Administrador',
        userRole: req.user?.role || 'admin',
        action: 'CRIOU_USUARIO_SISTEMA',
        resource: 'User',
        resourceId: created.id,
        details: JSON.stringify({ name: created.name, email: created.email, role: created.role, authProvisioning: provisionedUserId ? 'created' : 'local-test' }),
        severity: 'info',
      } })
      return created
    })

    res.status(201).json({ ...user, authProvisioning: provisionedUserId ? 'created' : 'not_required' })
  } catch (error: any) {
    if (provisionedUserId) await removeProvisionedUser(provisionedUserId)
    if (error instanceof SupabaseProvisioningError) return res.status(error.statusCode).json({ error: error.message })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'E-mail já cadastrado.' })
    }
    console.error('Erro ao criar usuário:', error)
    res.status(500).json({ error: 'Erro ao criar usuário' })
  }
})

// Toggle Staff User Status
adminRouter.patch('/users/:id/status', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const { status } = req.body
    if (!['ativo', 'inativo'].includes(status)) return res.status(400).json({ error: 'Status de usuário inválido' })

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: publicUserSelect,
    })

    await prisma.auditEvent.create({
      data: {
        userId: req.user?.id || null,
        userName: req.user?.name || 'Administrador',
        userRole: req.user?.role || 'admin',
        action: 'ALTEROU_STATUS_USUARIO',
        resource: 'User',
        resourceId: user.id,
        details: JSON.stringify({ targetUserName: user.name, newStatus: status }),
        severity: 'warning',
      },
    })

    res.json(user)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar status do usuário' })
  }
})

// ==========================================
// REAL AI OPERATIONAL DIAGNOSTIC & ANALYSIS
// ==========================================

// Trigger new AI Administrative Analysis
adminRouter.post('/ai-analysis', authenticateToken, requireRole(['admin', 'asa']), async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalStudents,
      totalAsa,
      activeAsa,
      totalTickets,
      openTickets,
      resolvedTickets,
      slaRiskTickets,
      allTickets,
      users,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.user.count({ where: { role: 'asa' } }),
      prisma.user.count({ where: { role: 'asa', status: 'ativo' } }),
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: { in: ['aberto', 'em_atendimento', 'aguardando_aluno'] } } }),
      prisma.ticket.count({ where: { status: { in: ['resolvido', 'fechado'] } } }),
      prisma.ticket.count({ where: { status: { in: ACTIVE_TICKET_STATUSES }, slaDeadline: { lt: new Date(Date.now() + 3600000) } } }),
      prisma.ticket.findMany({ select: { category: true, title: true }, orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({
        where: { role: 'asa' },
        select: { name: true, _count: { select: { assignedTickets: { where: { status: { in: ACTIVE_TICKET_STATUSES } } } } } },
      }),
    ])

    const categoryDistribution: Record<string, number> = {}
    allTickets.forEach(t => {
      categoryDistribution[t.category] = (categoryDistribution[t.category] || 0) + 1
    })

    const recentTicketSample = allTickets.slice(0, 10).map(t => t.title)
    const topAttendantLoads = users.map(u => ({ name: u.name, tickets: u._count.assignedTickets }))

    const analysis = await aiService.generateAdminExecutiveReport({
      totalStudents,
      totalAsa,
      activeAsa,
      totalTickets,
      openTickets,
      resolvedTickets,
      slaRiskTickets,
      categoryDistribution,
      recentTicketSample,
      topAttendantLoads,
    })

    const report = await prisma.adminAIReport.create({
      data: {
        summary: analysis.summary,
        healthScore: analysis.healthScore,
        diagnostics: JSON.stringify(analysis.diagnostics),
        recommendations: JSON.stringify(analysis.recommendations),
        metricsSnapshot: JSON.stringify({
          analysisSource: analysis.source,
          analysisModel: analysis.model,
          totalStudents,
          totalAsa,
          activeAsa,
          totalTickets,
          openTickets,
          resolvedTickets,
          slaRiskTickets,
          categoryDistribution,
        }),
        authorId: req.user?.id || null,
      },
    })

    await prisma.auditEvent.create({
      data: {
        userId: req.user?.id || null,
        userName: req.user?.name || 'Administrador',
        userRole: req.user?.role || 'admin',
        action: 'GEROU_RELATORIO_IA_ADMIN',
        resource: 'AdminAIReport',
        resourceId: report.id,
        details: JSON.stringify({ healthScore: report.healthScore, recsCount: analysis.recommendations.length }),
        severity: 'info',
      },
    })

    res.json({
      ...report,
      diagnostics: analysis.diagnostics,
      recommendations: analysis.recommendations,
      metricsSnapshot: JSON.parse(report.metricsSnapshot),
    })
  } catch (error: any) {
    console.error('Erro ao gerar relatório administrativo com IA:', error)
    res.status(500).json({ error: error.message || 'Erro ao processar análise de IA' })
  }
})

// AI Analysis History
adminRouter.get('/ai-analysis/history', authenticateToken, requireRole(['admin', 'asa']), async (req, res) => {
  try {
    const reports = await prisma.adminAIReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const formatted = reports.map(r => ({
      ...r,
      diagnostics: JSON.parse(r.diagnostics || '[]'),
      recommendations: JSON.parse(r.recommendations || '[]'),
      metricsSnapshot: JSON.parse(r.metricsSnapshot || '{}'),
    }))

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico de análises de IA' })
  }
})


// AI Feedback Overview (Real Data from AIFeedback table)
adminRouter.get('/feedback', authenticateToken, requireRole(['admin', 'asa']), async (req, res) => {
  try {
    const [feedbacks, positiveCount, negativeCount, totalCount] = await Promise.all([
      prisma.aIFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.aIFeedback.count({ where: { type: 'positive' } }),
      prisma.aIFeedback.count({ where: { type: 'negative' } }),
      prisma.aIFeedback.count(),
    ])

    const positiveRate = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0
    const negativeRate = totalCount > 0 ? Math.round((negativeCount / totalCount) * 100) : 0

    res.json({
      positiveCount,
      negativeCount,
      totalCount,
      positiveRate,
      negativeRate,
      feedbacks,
    })
  } catch (error) {
    console.error('Erro ao buscar feedback:', error)
    res.status(500).json({ error: 'Erro ao buscar métricas de feedback' })
  }
})
