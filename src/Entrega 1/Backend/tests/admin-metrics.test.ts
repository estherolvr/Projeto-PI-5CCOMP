import test from 'node:test'
import assert from 'node:assert/strict'
import { liveSlaStatus, reportPeriod, resolutionDates, ticketAnalytics, type MetricTicket } from '../src/services/admin-metrics'
import { operationalHealth, publicIntegrationConfig } from '../src/services/admin-health'

const now = new Date('2026-10-29T15:00:00Z')
const base: MetricTicket = {
  id: 'ticket-1', number: 1, status: 'aberto', category: 'academico', priority: 'media',
  createdAt: '2026-10-29T03:00:00Z', slaDeadline: '2026-10-29T14:00:00Z',
}

test('empty datasets never invent response times, CSAT or percentages', () => {
  const result = ticketAnalytics([], [], [], reportPeriod(7, now))
  assert.equal(result.summary.totalTickets, 0)
  for (const key of ['resolutionRate', 'slaAdherence', 'csat', 'avgResponseMinutes', 'avgResolutionHours'] as const) {
    assert.equal(result.summary[key], null)
  }
  assert.equal(result.chartData.length, 7)
  assert.ok(result.chartData.every(row => row.criados === 0 && row.resolvidos === 0))
})

test('period boundaries are local to São Paulo; deadline is live, regardless of stored SLA status', () => {
  const period = reportPeriod(1, now)
  assert.equal(period.start.toISOString(), '2026-10-29T03:00:00.000Z')
  const result = ticketAnalytics([
    { ...base, id: 'previous-local-day', createdAt: '2026-10-29T02:59:59Z' },
    { ...base, status: 'aguardando_aluno' },
    { ...base, id: 'risk', number: 2, slaDeadline: '2026-10-29T15:30:00Z' },
  ], [], [], period)
  assert.equal(result.summary.totalTickets, 2)
  assert.equal(result.summary.waitingTickets, 1)
  assert.equal(result.summary.activeSlaBreachedTickets, 1)
  assert.equal(result.summary.activeSlaRiskTickets, 1)
  assert.equal(result.summary.slaAdherence, 50)
  assert.equal(liveSlaStatus({ slaDeadline: now }, now), 'breached')
})

test('response time excludes private notes; unknown historical resolution is excluded from measured samples', () => {
  const result = ticketAnalytics([
    { ...base, status: 'resolvido', messages: [
      { senderRole: 'asa', isInternal: true, createdAt: '2026-10-29T03:01:00Z' },
      { senderRole: 'sistema', isInternal: false, createdAt: '2026-10-29T03:02:00Z' },
      { senderRole: 'asa', isInternal: false, createdAt: '2026-10-29T03:15:00Z' },
    ] },
  ], [], [{ rating: 5 }, { rating: 1 }, { rating: null }, { rating: 99 }], reportPeriod(1, now))
  assert.equal(result.summary.avgResponseMinutes, 15)
  assert.equal(result.summary.avgResolutionHours, null)
  assert.equal(result.summary.slaAdherence, null)
  assert.equal(result.sampleCounts.slaUnknown, 1)
  assert.equal(result.summary.csat, 3)
  assert.equal(result.sampleCounts.feedbackRatings, 2)
})

test('resolution uses audit timestamps, preserves resolution on close, and resets on reopen', () => {
  const audits = [
    { resourceId: '#1', details: 'Chamado atualizado: {"status":"resolvido"}', createdAt: '2026-10-29T05:00:00Z' },
    { resourceId: '#1', details: '{"status":"fechado","previousStatus":"resolvido"}', createdAt: '2026-10-29T06:00:00Z' },
  ]
  const tickets = [{ ...base, status: 'fechado' }]
  assert.equal(resolutionDates(tickets, audits).get(base.id)?.toISOString(), '2026-10-29T05:00:00.000Z')
  const result = ticketAnalytics(tickets, audits, [], reportPeriod(1, now))
  assert.equal(result.summary.avgResolutionHours, 2)
  assert.equal(result.summary.slaAdherence, 100)
  assert.equal(result.chartData[0].resolvidos, 1)
  audits.push({ resourceId: '#1', details: '{"status":"aberto","previousStatus":"fechado"}', createdAt: '2026-10-29T07:00:00Z' })
  assert.equal(resolutionDates(tickets, audits).has(base.id), false)
  const reopened = ticketAnalytics([{ ...base, status: 'aberto' }], audits, [], reportPeriod(1, now))
  assert.equal(reopened.chartData[0].resolvidos, 1, 'Reopening preserves the historical resolution event')
  audits.push({ resourceId: '#1', details: '{"status":"resolvido","previousStatus":"aberto"}', createdAt: '2026-10-29T14:30:00Z' })
  assert.equal(ticketAnalytics(tickets, audits, [], reportPeriod(1, now)).summary.slaAdherence, 0)
  assert.equal(ticketAnalytics(tickets, audits, [], reportPeriod(1, now)).chartData[0].resolvidos, 2)
})

test('database failure and configured remote services are reported without fictitious uptime', async () => {
  const result = await operationalHealth(async () => { throw new Error('offline') }, {
    GEMINI_API_KEY: 'configured-test-key', R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c',
  })
  assert.equal(result.checks.find(check => check.id === 'database')?.status, 'indisponivel')
  assert.equal(result.checks.find(check => check.id === 'gemini')?.status, 'configurado')
  assert.equal(result.checks.find(check => check.id === 'r2')?.status, 'configurado')
  assert.deepEqual(publicIntegrationConfig('{"provider":"Google","token":"secret","nested":{"apiKey":"secret"}}'), { provider: 'Google' })
})
