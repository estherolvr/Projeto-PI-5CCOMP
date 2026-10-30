export const ACTIVE_TICKET_STATUSES = ['aberto', 'em_atendimento', 'aguardando_aluno']
export const COMPLETED_TICKET_STATUSES = ['resolvido', 'fechado']
export const REPORT_TIME_ZONE = 'America/Sao_Paulo'
const reportDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})

type Timestamp = Date | string
export interface MetricTicket {
  id: string
  number: number
  category: string
  priority: string
  status: string
  createdAt: Timestamp
  slaDeadline: Timestamp
  messages?: { senderRole: string; isInternal: boolean; createdAt: Timestamp }[]
}
export interface StatusAudit {
  resourceId: string
  details: string | null
  createdAt: Timestamp
}

export function localDateKey(value: Timestamp): string {
  const parts = reportDateFormatter.formatToParts(new Date(value))
  const part = (type: string) => parts.find(p => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function reportPeriod(days: number, now = new Date()) {
  // All reporting dates use the institution's time zone, independently of the server.
  const today = new Date(`${localDateKey(now)}T00:00:00-03:00`)
  const start = new Date(today.getTime() - (days - 1) * 86400000)
  return { days, start, end: now, timeZone: REPORT_TIME_ZONE }
}

/** Accept both the old human-readable audit detail and the structured status audit. */
export function resolutionHistory(tickets: MetricTicket[], audits: StatusAudit[]) {
  const ticketIds = new Map(tickets.flatMap(t => [[t.id, t.id], [`#${t.number}`, t.id]] as [string, string][]))
  const completed = new Map<string, Date>()
  const events: { ticketId: string; at: Date }[] = []
  const previousStatuses = new Map<string, string>()
  for (const audit of [...audits].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))) {
    const id = ticketIds.get(audit.resourceId)
    if (!id || !audit.details) continue
    try {
      const jsonStart = audit.details.indexOf('{')
      if (jsonStart < 0) continue
      const details = JSON.parse(audit.details.slice(jsonStart))
      const status = details.status ?? details.newStatus
      if (typeof status !== 'string') continue
      const previous = details.previousStatus ?? previousStatuses.get(id)
      if (COMPLETED_TICKET_STATUSES.includes(status)) {
        // Closing an already resolved ticket is not a second resolution.
        if (!COMPLETED_TICKET_STATUSES.includes(previous)) {
          const at = new Date(audit.createdAt)
          completed.set(id, at)
          events.push({ ticketId: id, at })
        }
      } else if (ACTIVE_TICKET_STATUSES.includes(status)) {
        completed.delete(id)
      }
      previousStatuses.set(id, status)
    } catch {
      // Legacy audits without a structured transition cannot establish resolution time.
    }
  }
  return { completed, events }
}

export function resolutionDates(tickets: MetricTicket[], audits: StatusAudit[]) {
  return resolutionHistory(tickets, audits).completed
}

export function liveSlaStatus(ticket: Pick<MetricTicket, 'slaDeadline'>, now = new Date()) {
  const remaining = +new Date(ticket.slaDeadline) - +now
  return remaining <= 0 ? 'breached' : remaining <= 3600000 ? 'risk' : 'ok'
}

const average = (values: number[], digits = 1) => values.length
  ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(digits)) : null

export function ticketAnalytics(
  tickets: MetricTicket[],
  audits: StatusAudit[],
  feedback: { rating: number | null }[],
  period = reportPeriod(30),
  totals = { totalStudents: 0, totalKB: 0 },
) {
  const { completed: resolutions, events: resolutionEvents } = resolutionHistory(tickets, audits)
  const withinPeriod = (date: Timestamp) => +new Date(date) >= +period.start && +new Date(date) <= +period.end
  const cohort = tickets.filter(t => withinPeriod(t.createdAt))
  const countStatus = (status: string) => cohort.filter(t => t.status === status).length
  const categoryCounts: Record<string, number> = {}
  const priorityCounts: Record<string, number> = {}
  const responseTimes: number[] = []
  const resolutionTimes: number[] = []
  let slaMeasured = 0
  let breachedTickets = 0
  let activeSlaRiskTickets = 0
  let activeSlaBreachedTickets = 0
  for (const ticket of cohort) {
    categoryCounts[ticket.category] = (categoryCounts[ticket.category] || 0) + 1
    priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1
    const response = (ticket.messages || [])
      .filter(m => ['asa', 'admin'].includes(m.senderRole) && !m.isInternal && +new Date(m.createdAt) >= +new Date(ticket.createdAt))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0]
    if (response) responseTimes.push((+new Date(response.createdAt) - +new Date(ticket.createdAt)) / 60000)
    const completedAt = resolutions.get(ticket.id)
    if (COMPLETED_TICKET_STATUSES.includes(ticket.status) && completedAt && +completedAt >= +new Date(ticket.createdAt)) {
      resolutionTimes.push((+completedAt - +new Date(ticket.createdAt)) / 3600000)
      slaMeasured++
      if (+completedAt > +new Date(ticket.slaDeadline)) breachedTickets++
    } else if (ACTIVE_TICKET_STATUSES.includes(ticket.status)) {
      slaMeasured++
      const sla = liveSlaStatus(ticket, period.end)
      if (sla === 'risk') activeSlaRiskTickets++
      if (sla === 'breached') { activeSlaBreachedTickets++; breachedTickets++ }
    }
  }
  const feedbackRatings = feedback.map(f => f.rating).filter((rating): rating is number =>
    typeof rating === 'number' && Number.isFinite(rating) && rating >= 1 && rating <= 5)
  const completedCount = countStatus('resolvido') + countStatus('fechado')
  const createdPerDay = new Map<string, number>()
  const resolvedPerDay = new Map<string, number>()
  for (const ticket of tickets) {
    if (withinPeriod(ticket.createdAt)) {
      const key = localDateKey(ticket.createdAt)
      createdPerDay.set(key, (createdPerDay.get(key) || 0) + 1)
    }
  }
  for (const event of resolutionEvents) {
    if (withinPeriod(event.at)) {
      const key = localDateKey(event.at)
      resolvedPerDay.set(key, (resolvedPerDay.get(key) || 0) + 1)
    }
  }
  const chartData = Array.from({ length: period.days }, (_, i) => {
    const date = new Date(+period.start + i * 86400000)
    const key = localDateKey(date)
    return {
      date: key,
      name: new Intl.DateTimeFormat('pt-BR', { timeZone: REPORT_TIME_ZONE, day: '2-digit', month: '2-digit' }).format(date),
      criados: createdPerDay.get(key) || 0,
      resolvidos: resolvedPerDay.get(key) || 0,
    }
  })
  return {
    period,
    summary: {
      totalTickets: cohort.length,
      openTickets: countStatus('aberto'),
      inProgressTickets: countStatus('em_atendimento'),
      waitingTickets: countStatus('aguardando_aluno'),
      resolvedTickets: countStatus('resolvido'),
      closedTickets: countStatus('fechado'),
      ...totals,
      resolutionRate: cohort.length ? Number((completedCount / cohort.length * 100).toFixed(1)) : null,
      slaAdherence: slaMeasured ? Number(((slaMeasured - breachedTickets) / slaMeasured * 100).toFixed(1)) : null,
      breachedTickets,
      activeSlaRiskTickets,
      activeSlaBreachedTickets,
      slaRiskTickets: activeSlaRiskTickets + activeSlaBreachedTickets,
      csat: average(feedbackRatings, 2),
      avgResponseMinutes: average(responseTimes),
      avgResolutionHours: average(resolutionTimes),
    },
    sampleCounts: {
      responseTimes: responseTimes.length, resolutionTimes: resolutionTimes.length,
      feedbackRatings: feedbackRatings.length, slaMeasured, slaUnknown: cohort.length - slaMeasured,
    },
    categoryDistribution: Object.entries(categoryCounts).map(([name, value]) => ({ name, value })),
    priorityDistribution: Object.entries(priorityCounts).map(([name, value]) => ({ name, value })),
    chartData,
  }
}

export const metricTicketSelect = {
  id: true, number: true, category: true, priority: true, status: true,
  createdAt: true, slaDeadline: true,
  messages: {
    where: { senderRole: { in: ['asa', 'admin'] as string[] }, isInternal: false },
    orderBy: { createdAt: 'asc' as const }, take: 1,
    select: { senderRole: true, isInternal: true, createdAt: true },
  },
} as const

export const statusAuditQuery = {
  where: { resource: { in: ['Chamado', 'Ticket'] }, action: { in: ['ticket.updated', 'ticket.status_changed'] } },
  select: { resourceId: true, details: true, createdAt: true },
  orderBy: { createdAt: 'asc' as const },
}
