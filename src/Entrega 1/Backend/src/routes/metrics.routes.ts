import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'
import { ACTIVE_TICKET_STATUSES, liveSlaStatus, metricTicketSelect, reportPeriod, statusAuditQuery, ticketAnalytics } from '../services/admin-metrics'

export const metricsRouter = Router()
metricsRouter.use(authenticateToken, requireRole(['admin', 'asa']))

// Metrics Overview
metricsRouter.get('/overview', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const days = req.query.days === undefined ? 30 : Number(req.query.days)
    if (![1, 7, 30, 90].includes(days)) return res.status(400).json({ error: 'Período inválido. Use 1, 7, 30 ou 90 dias.' })
    const period = reportPeriod(days)
    const [tickets, audits, feedback, attendants, totalStudents, totalKB] = await Promise.all([
      prisma.ticket.findMany({ select: metricTicketSelect }),
      prisma.auditEvent.findMany(statusAuditQuery),
      prisma.aIFeedback.findMany({ where: { createdAt: { gte: period.start, lte: period.end } }, select: { rating: true } }),
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
    res.json({
      ...ticketAnalytics(tickets, audits, feedback, period, { totalStudents, totalKB }),
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
