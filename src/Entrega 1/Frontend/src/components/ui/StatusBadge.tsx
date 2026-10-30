import Badge from './Badge'
import type { TicketStatus } from '../../lib/mock-data'

interface StatusBadgeProps {
  status: TicketStatus
}

const config: Record<TicketStatus, { label: string; variant: 'info' | 'warning' | 'purple' | 'success' | 'default' }> = {
  aberto: { label: 'Aberto', variant: 'info' },
  em_atendimento: { label: 'Em atendimento', variant: 'warning' },
  aguardando_aluno: { label: 'Aguardando aluno', variant: 'purple' },
  resolvido: { label: 'Resolvido', variant: 'success' },
  fechado: { label: 'Fechado', variant: 'default' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = config[status] ?? config.aberto
  return <Badge variant={variant} dot>{label}</Badge>
}
