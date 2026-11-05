import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'
import { ACTIVE_TICKET_STATUSES, liveSlaStatus, metricTicketSelect, reportPeriod, reportPeriodRange, statusAuditQuery, ticketAnalytics } from '../services/admin-metrics'

export const metricsRouter = Router()
metricsRouter.use(authenticateToken, requireRole(['admin', 'asa']))

// Metrics Overview
metricsRouter.get('/overview', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const hasRange = typeof req.query.start === 'string' || typeof req.query.end === 'string'
    const days = req.query.days === undefined ? 30 : Number(req.query.days)
    if (!hasRange && ![1, 7, 30, 90].includes(days)) return res.status(400).json({ error: 'Período inválido. Use 1, 7, 30 ou 90 dias.' })
    if (hasRange && (typeof req.query.start !== 'string' || typeof req.query.end !== 'string')) return res.status(400).json({ error: 'Informe as datas inicial e final.' })
    const start = hasRange ? new Date(`${req.query.start}T00:00:00-03:00`) : null
    const end = hasRange ? new Date(`${req.query.end}T23:59:59.999-03:00`) : null
    if (hasRange && (!start || !end || Number.isNaN(+start) || Number.isNaN(+end) || +start > +end)) return res.status(400).json({ error: 'Intervalo de datas inválido.' })
    const period = hasRange ? reportPeriodRange(start!, end!) : reportPeriod(days)
    if (period.days > 366) return res.status(400).json({ error: 'O período máximo é de 366 dias.' })
    const previousEnd = new Date(+period.start - 1)
    const previousStart = new Date(+previousEnd - (period.days - 1) * 86400000)
    const previousPeriod = reportPeriodRange(previousStart, previousEnd)
    const [tickets, audits, feedback, previousFeedback, attendants, totalStudents, totalKB] = await Promise.all([
      prisma.ticket.findMany({ select: metricTicketSelect }),
      prisma.auditEvent.findMany(statusAuditQuery),
      prisma.aIFeedback.findMany({ where: { createdAt: { gte: period.start, lte: period.end } }, select: { rating: true } }),
      prisma.aIFeedback.findMany({ where: { createdAt: { gte: previousPeriod.start, lte: previousPeriod.end } }, select: { rating: true } }),
      prisma.user.findMany({
        where: { role: 'asa', status: 'ativo' },
        select: {
          id: true, name: true, email: true,
          _count: { select: { assignedTickets: { where: { status: { in: ACTIVE_TICKET_STATUSES } } } } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.student.count(),
      prisma.kBDocument.count({ where: { status: 'ativo' } }),
    ])
    const current = ticketAnalytics(tickets, audits, feedback, period, { totalStudents, totalKB })
    const previous = ticketAnalytics(tickets, audits, previousFeedback, previousPeriod, { totalStudents, totalKB })
    res.json({
      ...current,
      comparison: { period: previous.period, summary: previous.summary },
      attendantsWorkload: attendants.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        activeTickets: a._count.assignedTickets,
      })),
    })
  } catch (error) {
    console.error('Erro ao calcular métricas:', error)
    res.status(500).json({ error: 'Erro ao obter métricas do sistema' })
  }
})

// Queue details for ASA attendants
metricsRouter.get('/queue', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const queueTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['aberto', 'em_atendimento', 'aguardando_aluno'] },
      },
      include: {
        student: true,
        attendant: {
          select: { id: true, name: true, email: true },
        },
        aiSuggestion: true,
      },
      orderBy: { slaDeadline: 'asc' },
    })

    const now = new Date()
    const formatted = queueTickets.map(t => {
      const remainingMs = new Date(t.slaDeadline).getTime() - now.getTime()
      const remainingMinutes = Math.round(remainingMs / (1000 * 60))
      const slaStatus = liveSlaStatus(t, now)
      return {
        ...t,
        slaStatus,
        tags: JSON.parse(t.tags || '[]'),
        slaRemainingMinutes: remainingMinutes,
        isSlaRisk: slaStatus === 'risk',
        isSlaBreached: slaStatus === 'breached',
      }
    })

    res.json(formatted)
  } catch (error) {
    console.error('Erro ao obter fila:', error)
    res.status(500).json({ error: 'Erro ao obter fila de atendimento' })
  }
})
