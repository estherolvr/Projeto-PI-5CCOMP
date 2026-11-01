export type UserRole = 'aluno' | 'asa' | 'admin'

export type TicketStatus = 'aberto' | 'em_atendimento' | 'aguardando_aluno' | 'resolvido' | 'fechado'

export type TicketPriority = 'baixa' | 'media' | 'alta' | 'critica'

export type TicketCategory =
  | 'matricula'
  | 'financeiro'
  | 'academico'
  | 'documentos'
  | 'outros'
  | 'infraestrutura'
  | 'cancelamento'

export type AppointmentStatus = 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'ausente'

export interface Appointment {
  id: string
  protocol: string
  studentId: string
  studentName: string
  studentRa: string
  studentEmail: string
  studentCourse?: string
  subject: string
  date: string
  time: string
  durationMinutes?: number
  location: string
  desk?: string
  notes?: string
  status: AppointmentStatus
  attendantId?: string | null
  attendantName?: string | null
  resolutionNotes?: string | null
  googleCalendarLink?: string | null
  documentName?: string | null
  documentType?: string | null
  documentSize?: string | null
  documentData?: string | null
  r2Key?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  department?: string
  status: 'ativo' | 'inativo'
  lastAccess: string
  createdAt: string
}

export interface Student {
  id: string
  name: string
  ra: string
  email: string
  course: string
  semester: number
  period: 'manha' | 'tarde' | 'noite'
  status: 'regular' | 'irregular' | 'trancado'
  phone?: string
  createdAt: string
}

export interface AIAnalysis {
  intent: string
  category: TicketCategory
  priority: TicketPriority
  summary: string
  confidence: number
  recommendation: string
  sentiment: 'positivo' | 'neutro' | 'negativo'
}

export interface Ticket {
  id: string
  number: number
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  studentId: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
  slaDeadline: string
  slaStatus: 'ok' | 'risk' | 'breached'
  tags: string[]
  aiSuggestion?: AIAnalysis
  conversationId?: string
}

export interface Attachment {
  id: string
  name: string
  size: string
  type: string
  url: string
}

export interface Message {
  id: string
  ticketId: string
  senderId: string
  senderName: string
  senderRole: UserRole | 'sistema'
  content: string
  createdAt: string
  attachments?: Attachment[]
  isInternal?: boolean
}

export interface ChatAction {
  label: string
  action: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  actions?: ChatAction[]
}

export interface Conversation {
  id: string
  studentId: string
  title: string
  status: 'ativo' | 'resolvido' | 'transferido'
  lastMessage: string
  lastMessageTime: string
  timestamp?: string
  unread: boolean
  aiHandled: boolean
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface KBDocument {
  id: string
  title: string
  category: string
  content: string
  version: string
  status: 'ativo' | 'rascunho' | 'arquivado'
  author: string
  tags: string[]
  views: number
  indexed: boolean
  source: 'manual' | 'upload'
  filename?: string
  fileSize?: number
  chunkCount?: number
  r2Key?: string
  createdAt: string
  updatedAt: string
}

export interface SLARule {
  id: string
  name: string
  priority: TicketPriority
  category?: TicketCategory
  firstResponseMinutes: number
  resolutionHours: number
  active: boolean
  createdAt: string
}

export interface AutomationTrigger {
  type: string
  field?: string
  operator?: string
  value?: string
}

export interface AutomationCondition {
  field: string
  operator: string
  value: string
}

export interface AutomationAction {
  type: string
  target?: string
  template?: string
  payload?: any
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  active: boolean
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  executionsCount: number
  createdAt: string
  updatedAt: string
}

export interface AuditEvent {
  id: string
  userId?: string
  userName: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  details: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: string
}

export interface AIPrompt {
  id: string
  name: string
  description: string
  content: string
  version: string
  status: 'ativo' | 'inativo' | 'teste'
  author: string
  uses: number
  successRate: number
  createdAt: string
  updatedAt: string
}

export interface Integration {
  id: string
  name: string
  description: string
  type: string
  status: 'operacional' | 'degradado' | 'offline' | 'nao_configurado'
  icon: string
  config: string
  lastSync: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'alert'
  read: boolean
  link?: string
  createdAt: string
}
