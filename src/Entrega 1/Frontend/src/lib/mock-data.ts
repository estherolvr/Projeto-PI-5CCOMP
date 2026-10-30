// ============================================================
// Álvaro AI — Mock Data (Frontend)
// Contém apenas 1 exemplo representativo por tela
// ============================================================

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

// -------------------------------------------------------
// USERS (3 contas oficiais para login nos 3 perfis do sistema)
// -------------------------------------------------------
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

export const mockUsers: User[] = [
  {
    id: 'admin-01',
    name: 'Ricardo Mendes',
    email: 'ricardo.mendes@fecap.br',
    role: 'admin',
    status: 'ativo',
    department: 'Tecnologia da Informação',
    lastAccess: new Date().toISOString(),
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'asa-01',
    name: 'Fernanda Costa',
    email: 'fernanda.costa@fecap.br',
    role: 'asa',
    status: 'ativo',
    department: 'Central ASA',
    lastAccess: new Date().toISOString(),
    createdAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'aluno-01',
    name: 'Esther Rodrigues',
    email: 'esther.rodrigues@aluno.fecap.br',
    role: 'aluno',
    status: 'ativo',
    department: 'Graduação',
    lastAccess: new Date().toISOString(),
    createdAt: '2024-02-01T00:00:00Z',
  },
]

// -------------------------------------------------------
// STUDENTS (1 aluna exemplo)
// -------------------------------------------------------
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

export const mockStudents: Student[] = [
  {
    id: 'aluno-01',
    name: 'Esther Rodrigues',
    ra: '24001523',
    email: 'esther.rodrigues@aluno.fecap.br',
    course: 'Administração',
    semester: 3,
    period: 'noite',
    status: 'regular',
    phone: '(11) 98765-4321',
    createdAt: '2024-02-01T00:00:00Z',
  },
]

// -------------------------------------------------------
// TICKETS (1 chamado exemplo)
// -------------------------------------------------------
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

export const mockTickets: Ticket[] = [
  {
    id: 'ticket-01',
    number: 1001,
    title: 'Orientação sobre Matrícula e Inclusão de Disciplinas',
    description: 'Gostaria de orientações sobre o período de inclusão de dependências (DP) e confirmação da grade do 3º semestre.',
    status: 'em_atendimento',
    priority: 'media',
    category: 'matricula',
    studentId: 'aluno-01',
    assignedTo: 'asa-01',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    slaDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    slaStatus: 'ok',
    tags: ['matricula', 'grade_horaria', 'dp'],
    aiSuggestion: {
      intent: 'duvida_matricula_dp',
      category: 'matricula',
      priority: 'media',
      summary: 'Estudante solicita instruções sobre o prazo de inclusão de disciplinas em regime de dependência.',
      confidence: 0.94,
      recommendation: 'Informar que o período de ajuste de matrícula no Portal do Aluno vai até 15/02 e fornecer o link direto do formulário acadêmico.',
      sentiment: 'neutro',
    },
    conversationId: 'conv-01',
  },
]

// -------------------------------------------------------
// MESSAGES (Mensagens do chamado exemplo)
// -------------------------------------------------------
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

export const mockMessages: Message[] = [
  {
    id: 'msg-01',
    ticketId: 'ticket-01',
    senderId: 'aluno-01',
    senderName: 'Esther Rodrigues',
    senderRole: 'aluno',
    content: 'Olá! Gostaria de saber até quando posso adicionar a matéria de DP de Estatística na minha grade horária deste semestre.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'msg-02',
    ticketId: 'ticket-01',
    senderId: 'asa-01',
    senderName: 'Fernanda Costa',
    senderRole: 'asa',
    content: 'Olá, Esther! O período oficial de ajuste de matrícula encerra na próxima sexta-feira. Você pode realizar a solicitação diretamente pela aba "Serviços Acadêmicos" no Portal.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
]

// -------------------------------------------------------
// CONVERSATIONS (1 conversa exemplo com o Álvaro AI)
// -------------------------------------------------------
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

export const mockConversations: Conversation[] = [
  {
    id: 'conv-01',
    studentId: 'aluno-01',
    title: 'Orientação Acadêmica e Matrícula',
    status: 'ativo',
    lastMessage: 'Para solicitar aproveitamento ou ajuste de matrícula, acesse a Central ASA ou Portal do Aluno.',
    lastMessageTime: new Date().toISOString(),
    unread: false,
    aiHandled: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'cmsg-01',
        role: 'user',
        content: 'Como funciona o processo de matrícula e rematrícula?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'cmsg-02',
        role: 'assistant',
        content: 'Olá, Esther! O processo de rematrícula é realizado 100% online pelo Portal do Aluno FECAP. Caso haja pendências financeiras ou solicitação de dispensa de disciplinas, o atendimento pode ser agendado presencialmente na Central ASA.',
        timestamp: new Date().toISOString(),
        actions: [
          { label: 'Agendar Presencial', action: 'agendamento' },
          { label: 'Abrir Chamado', action: 'novo-chamado' },
        ],
      },
    ],
  },
]

// -------------------------------------------------------
// KNOWLEDGE BASE (1 documento oficial de exemplo)
// -------------------------------------------------------
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

export const mockKBDocuments: KBDocument[] = [
  {
    id: 'kb-01',
    title: 'Manual Oficial do Estudante FECAP · Guia Acadêmico e Matrícula',
    category: 'Geral',
    content: `REGULAMENTO ACADÊMICO INSTITUCIONAL FECAP (CENTRAL ASA)

1. MATRÍCULA E REMATRÍCULA
A rematrícula semestral é obrigatória para todos os cursos de graduação e pós-graduação. O período oficial ocorre sempre nos meses de janeiro e julho pelo Portal do Aluno.

2. APROVEITAMENTO DE DISCIPLINAS E DISPENSAS
O aluno transferido ou portador de diploma tem direito ao aproveitamento de estudos mediante protocolo formal com histórico escolar oficial.

3. FREQUÊNCIA E CRITÉRIOS DE APROVAÇÃO
A frequência mínima obrigatória por lei em cada disciplina é de 75%. A média semestral para aprovação direta é 6,0 (seis).

4. ATENDIMENTO PRESENCIAL CENTRAL ASA
Localização: Campus Liberdade, Bloco B, Térreo.
Horário de atendimento presencial: segunda a sexta-feira, das 08h30 às 20h30.`,
    version: '2026.1',
    status: 'ativo',
    author: 'Coordenadoria Acadêmica ASA',
    tags: ['matricula', 'rematricula', 'frequencia', 'central_asa', 'regras'],
    views: 142,
    indexed: true,
    source: 'manual',
    filename: 'manual_aluno_fecap_2026.pdf',
    fileSize: 245000,
    chunkCount: 4,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
]

// -------------------------------------------------------
// APPOINTMENTS (1 agendamento presencial exemplo)
// -------------------------------------------------------
export const mockAppointments: Appointment[] = [
  {
    id: 'apt-01',
    protocol: 'AG-2026-1001',
    studentId: 'aluno-01',
    studentName: 'Esther Rodrigues',
    studentRa: '24001523',
    studentEmail: 'esther.rodrigues@aluno.fecap.br',
    studentCourse: 'Administração',
    subject: 'Orientação de Matrícula e Grade Horária',
    date: new Date().toISOString().split('T')[0],
    time: '14:15',
    durationMinutes: 30,
    location: 'Campus Liberdade · Bloco B · Térreo (Central ASA)',
    desk: 'Guichê Presencial 01',
    notes: 'Orientação acadêmica e validação de compatibilidade de horário com estágio.',
    status: 'confirmado',
    attendantId: 'asa-01',
    attendantName: 'Fernanda Costa',
    googleCalendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Atendimento+Presencial+ASA+FECAP:+Matr%C3%ADcula&dates=20261022T171500Z/20261022T174500Z',
    documentName: 'comprovante_matricula_fecap.pdf',
    documentType: 'application/pdf',
    documentSize: '180 KB',
    documentData: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// -------------------------------------------------------
// SLA RULES (Regras essenciais da Central ASA)
// -------------------------------------------------------
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

export const mockSLARules: SLARule[] = [
  {
    id: 'sla-01',
    name: 'SLA Padrão Acadêmico e Matrícula',
    priority: 'media',
    category: 'matricula',
    firstResponseMinutes: 60,
    resolutionHours: 24,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sla-02',
    name: 'SLA Emergencial / Crítico',
    priority: 'critica',
    firstResponseMinutes: 15,
    resolutionHours: 4,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
]

// -------------------------------------------------------
// AUTOMATIONS (1 regra de automação exemplo)
// -------------------------------------------------------
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

export const mockAutomations: AutomationRule[] = [
  {
    id: 'auto-01',
    name: 'Triagem Automática com IA Álvaro',
    description: 'Classifica categoria e prioridade de novos chamados usando IA generativa.',
    active: true,
    trigger: { type: 'ticket_created' },
    conditions: [{ field: 'status', operator: 'equals', value: 'aberto' }],
    actions: [{ type: 'ai_analyze' }, { type: 'notify_attendant', target: 'asa' }],
    executionsCount: 48,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
]

// -------------------------------------------------------
// AUDIT EVENTS (1 evento exemplo)
// -------------------------------------------------------
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

export const mockAuditEvents: AuditEvent[] = [
  {
    id: 'audit-01',
    userId: 'admin-01',
    userName: 'Ricardo Mendes',
    userRole: 'admin',
    action: 'system.boot',
    resource: 'System',
    resourceId: 'alvaro-ai-core',
    details: 'Inicialização do núcleo Álvaro AI com Cloudflare R2 e base institucional FECAP.',
    severity: 'info',
    timestamp: new Date().toISOString(),
  },
]

// -------------------------------------------------------
// PROMPTS (1 prompt do sistema para a IA)
// -------------------------------------------------------
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

export const mockPrompts: AIPrompt[] = [
  {
    id: 'prompt-01',
    name: 'Assistente Álvaro AI - Atendimento Acadêmico',
    description: 'Prompt base institucional da Central ASA da FECAP para orientação de matrícula e serviços.',
    content: 'Você é o Álvaro AI, assistente institucional da Central de Sucesso Alvarista (ASA) da FECAP. Responda de forma acolhedora, clara, formal e embasada exclusivamente no regulamento acadêmico.',
    version: 'v1.0',
    status: 'ativo',
    author: 'Equipe ASA',
    uses: 128,
    successRate: 0.95,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
]

// -------------------------------------------------------
// INTEGRATIONS (1 integração exemplo)
// -------------------------------------------------------
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

export const mockIntegrations: Integration[] = [
  {
    id: 'integ-01',
    name: 'Cloudflare R2 Object Storage',
    description: 'Armazenamento persistente de anexos e snapshots de conversas na nuvem Cloudflare.',
    type: 'storage',
    status: 'operacional',
    icon: 'cloud',
    config: '{"bucket":"alvaro-ai-storage"}',
    lastSync: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
  },
]

// -------------------------------------------------------
// NOTIFICATIONS (1 notificação exemplo)
// -------------------------------------------------------
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

export const mockNotifications: Notification[] = [
  {
    id: 'notif-01',
    userId: 'aluno-01',
    title: 'Central ASA · Novo Horário Disponível',
    message: 'Seu agendamento presencial está confirmado para hoje às 14:15.',
    type: 'info',
    read: false,
    link: '/aluno/agendamento',
    createdAt: new Date().toISOString(),
  },
]

// -------------------------------------------------------
// CHART DATA & METRICS
// -------------------------------------------------------
export const mockChartData: any = {
  ticketsByStatus: [
    { name: 'Em Atendimento', value: 1, color: '#0284c7' },
  ],
  ticketsByCategory: [
    { name: 'Matrícula', value: 1 },
  ],
  ticketsPerDay: [
    { date: 'Hoje', count: 1 },
  ],
  ticketsOverTime: [
    { date: 'Hoje', count: 1 },
  ],
  slaCompliance: [
    { name: 'No Prazo', value: 100 },
  ],
  aiMetrics: {
    accuracy: 94.8,
    deflectionRate: 68.2,
    avgConfidence: 91.5,
    totalInteractions: 142,
    csat: 4.8,
  },
}

export const mockCurrentUser = mockUsers[2] // Esther Rodrigues (Aluno)

export const mockSystemStatus = {
  status: 'operacional',
  uptime: '99.98%',
  latency: '38ms',
  storage: 'Cloudflare R2 Ativo',
}
