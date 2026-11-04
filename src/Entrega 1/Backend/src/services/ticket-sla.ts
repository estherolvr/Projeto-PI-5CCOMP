import { liveSlaStatus } from './admin-metrics'

export interface SlaRule {
  id: string; name: string; priority: string; category?: string | null
  active: boolean; firstResponseMinutes: number; resolutionHours: number
  updatedAt?: Date | string
}
export interface SlaPolicy {
  ruleId: string | null; ruleName: string; firstResponseMinutes: number | null
  firstResponseDeadline: string | null; resolutionHours: number; resolutionDeadline: string
}
export const normalizeSlaCategory = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function validateSlaRule(input: any) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''
  const priority = input?.priority
  const firstResponseMinutes = Number(input?.firstResponseMinutes)
  const resolutionHours = Number(input?.resolutionHours)
  const category = typeof input?.category === 'string' ? normalizeSlaCategory(input.category) : null
  if (!name || name.length > 150 || !['baixa', 'media', 'alta', 'critica'].includes(priority)
    || !Number.isInteger(firstResponseMinutes) || firstResponseMinutes <= 0
    || !Number.isInteger(resolutionHours) || resolutionHours <= 0 || resolutionHours > 8760
    || firstResponseMinutes > resolutionHours * 60 || (category?.length || 0) > 100
    || (input?.active !== undefined && typeof input.active !== 'boolean')) return null
  return { name, priority, category: !category || category === 'todas' ? null : category, firstResponseMinutes, resolutionHours, active: input.active ?? true }
}

/** A rule change does not rewrite existing assignments. Priority/category changes
 * explicitly reassign the SLA, still anchored to the ticket's original creation. */
export function resolveSlaPolicy(priority: string, category: string, rules: SlaRule[], createdAt: Date): SlaPolicy {
  const matching = rules.filter(r => r.active && r.priority === priority)
    .sort((a, b) => +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0))
  const normalized = normalizeSlaCategory(category)
  const rule = matching.find(r => r.category && normalizeSlaCategory(r.category) === normalized)
    || matching.find(r => !r.category || normalizeSlaCategory(r.category) === 'todas')
  const resolutionHours = rule?.resolutionHours ?? ({ critica: 2, alta: 4, media: 24, baixa: 72 }[priority] || 24)
  const firstResponseMinutes = rule?.firstResponseMinutes ?? null
  return {
    ruleId: rule?.id || null, ruleName: rule?.name || 'Prazo padrão da prioridade', resolutionHours,
    resolutionDeadline: new Date(+createdAt + resolutionHours * 3600000).toISOString(),
    firstResponseMinutes,
    firstResponseDeadline: firstResponseMinutes == null ? null : new Date(+createdAt + firstResponseMinutes * 60000).toISOString(),
  }
}

export function assignedSlaPolicies(audits: { resourceId: string; details: string | null }[]) {
  const policies = new Map<string, SlaPolicy>()
  for (const event of audits) {
    try {
      const policy = JSON.parse(event.details || '{}').sla
      if (policy && Number.isFinite(+new Date(policy.resolutionDeadline))) policies.set(event.resourceId, policy)
    } catch { /* Older human-readable audits do not establish a first-response deadline. */ }
  }
  return policies
}

export function evaluateTicketSla(ticket: { createdAt: Date | string; slaDeadline: Date | string; messages?: { createdAt: Date | string; senderRole: string; isInternal: boolean }[] }, policy?: SlaPolicy, now = new Date()) {
  const firstReply = (ticket.messages || []).filter(m => ['asa', 'admin'].includes(m.senderRole) && !m.isInternal && +new Date(m.createdAt) > +new Date(ticket.createdAt))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0]
  const responseDeadline = policy?.firstResponseDeadline || null
  const remainingResponseMs = responseDeadline ? +new Date(responseDeadline) - +now : 0
  const responseRiskWindowMs = Math.min(3600000, (policy?.firstResponseMinutes || 0) * 60000 * 0.2)
  const firstResponseStatus = !responseDeadline ? 'unknown' : firstReply
    ? (+new Date(firstReply.createdAt) <= +new Date(responseDeadline) ? 'met' : 'breached')
    : remainingResponseMs <= 0 ? 'breached' : remainingResponseMs <= responseRiskWindowMs ? 'risk' : 'ok'
  return {
    resolutionDeadline: new Date(ticket.slaDeadline).toISOString(), resolutionStatus: liveSlaStatus(ticket, now),
    firstResponseDeadline: responseDeadline, firstResponseAt: firstReply ? new Date(firstReply.createdAt).toISOString() : null,
    firstResponseStatus, ruleName: policy?.ruleName || 'Prazo de resolução registrado; primeira resposta sem histórico de regra',
  }
}
