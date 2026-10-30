import { aiService } from '../services/ai.service'
import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { ACTIVE_TICKET_STATUSES, COMPLETED_TICKET_STATUSES, liveSlaStatus, metricTicketSelect, reportPeriod, statusAuditQuery, ticketAnalytics } from '../services/admin-metrics'
import { operationalHealth, publicIntegrationConfig } from '../services/admin-health'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'

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
    const { name, priority, category, firstResponseMinutes, resolutionHours, active } = req.body
    if (typeof name !== 'string' || !name.trim() || !['baixa', 'media', 'alta', 'critica'].includes(priority)
      || !Number.isInteger(Number(firstResponseMinutes)) || Number(firstResponseMinutes) <= 0
      || !Number.isInteger(Number(resolutionHours)) || Number(resolutionHours) <= 0) {
      return res.status(400).json({ error: 'Informe nome, prioridade e prazos inteiros positivos.' })
    }
    const rule = await prisma.sLARule.create({
      data: {
        name,
        priority,
        category: category || null,
        firstResponseMinutes: Number(firstResponseMinutes),
        resolutionHours: Number(resolutionHours),
        active: active !== undefined ? Boolean(active) : true,
      },
    })
    res.status(201).json(rule)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar regra de SLA' })
  }
})

// Automations
adminRouter.get('/automations', authenticateToken, async (req, res) => {
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
adminRouter.get('/users', authenticateToken, async (req, res) => {
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
adminRouter.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
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

adminRouter.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
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
  try {
    const { name, ra, email, course, semester, period, phone, status } = req.body
    if (![name, ra, email, course].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Nome, RA, e-mail e curso são obrigatórios' })
    }
    if ((period && !['manha', 'tarde', 'noite'].includes(period))
      || (status && !['regular', 'irregular', 'trancado'].includes(status))
      || (semester !== undefined && (!Number.isInteger(Number(semester)) || Number(semester) < 1))) {
      return res.status(400).json({ error: 'Período, situação ou semestre inválido.' })
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        ra: ra.trim(),
        email: email.trim().toLowerCase(),
        course: course.trim(),
        semester: Number(semester) || 1,
        period: period || 'manha',
        phone: phone || null,
        status: status || 'regular',
      },
    })

    await prisma.auditEvent.create({
      data: {
        userId: req.user?.id || null,
        userName: req.user?.name || 'Administrador',
        userRole: req.user?.role || 'admin',
        action: 'CRIOU_ALUNO',
        resource: 'Student',
        resourceId: student.id,
        details: JSON.stringify({ name: student.name, ra: student.ra, course: student.course }),
        severity: 'info',
      },
    })

    res.status(201).json(student)
  } catch (error: any) {
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

// Create Staff User (ASA or Admin)
adminRouter.post('/users', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, password, role, department } = req.body
    if (![name, email].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' })
    }
    if (role && !['admin', 'asa'].includes(role)) return res.status(400).json({ error: 'Perfil de equipe inválido.' })

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password || '123456',
        role: role || 'asa',
        department: department || 'Atendimento ASA',
        status: 'ativo',
      },
      select: publicUserSelect,
    })

    await prisma.auditEvent.create({
      data: {
        userId: req.user?.id || null,
        userName: req.user?.name || 'Administrador',
        userRole: req.user?.role || 'admin',
        action: 'CRIOU_USUARIO_SISTEMA',
        resource: 'User',
        resourceId: user.id,
        details: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
        severity: 'info',
      },
    })

    res.status(201).json(user)
  } catch (error: any) {
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
