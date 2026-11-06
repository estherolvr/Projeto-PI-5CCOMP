import type { Ticket, TicketCategory, TicketPriority, TicketStatus, UserRole } from './types'
import { clearAuthToken, getAuthToken } from './auth-session'
import { useAppStore } from '../store/app-store'

export interface UserNotification {
  id: string
  type: 'new_ticket' | 'ticket_updated' | 'ticket_message' | 'sla_risk' | 'appointment'
  title: string
  message: string
  priority: 'medium' | 'high'
  link: string
  createdAt: string
  read: boolean
}

function getBaseUrl(): string {
  const raw = ((import.meta as any).env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  return raw ? (raw.endsWith('/api') ? raw : `${raw}/api`) : '/api'
}

function getFullUrl(endpoint: string): string {
  const base = getBaseUrl()
  const cleanEndpoint = endpoint.replace(/^\/+/, '')
  return `${base}/${cleanEndpoint}`
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = getAuthHeaders()
  if (options.body instanceof FormData) {
    delete authHeaders['Content-Type']
  }

  const headers = {
    ...authHeaders,
    ...(options.headers || {}),
  }

  const response = await fetch(getFullUrl(endpoint), {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        clearAuthToken()
        useAppStore.getState().setCurrentUser(null)
      }
    }
    const errorData = await response.json().catch(() => ({}))
    const statusMsg = response.status === 401 ? 'Sessão expirada ou não autenticada. Faça login novamente.' : (response.statusText || `Código HTTP ${response.status}`)
    throw new Error(errorData.error || errorData.message || statusMsg)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

async function downloadFile(endpoint: string): Promise<void> {
  const response = await fetch(getFullUrl(endpoint), { headers: getAuthHeaders() })
  if (response.status === 401) {
    clearAuthToken()
    useAppStore.getState().setCurrentUser(null)
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || response.statusText || `Código HTTP ${response.status}`)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
  let filename = plainName || 'download'
  if (encodedName) {
    try { filename = decodeURIComponent(encodedName) } catch { filename = encodedName }
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export const api = {
  documents: {
    issueEnrollmentDeclaration: () => request<any>('/documents/enrollment-declaration', { method:'POST' }),
    verify: (token:string) => request<any>(`/documents/verify?token=${encodeURIComponent(token)}`),
  },
  banners: {
    list: () => request<any[]>('/banners'),
  },
  notifications: {
    readAll: () => request<{readAt:string}>('/notifications/read-all', { method: 'PATCH' }),
    list: () => request<UserNotification[]>('/notifications'),
    read: (id: string) => request<UserNotification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  },
  auth: {
    login: (email: string, password?: string) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ user: any }>('/auth/me'),
    recoverPassword: (email: string) => request<{ message: string }>('/auth/recover-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (accessToken: string, password: string) => request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ accessToken, password }) }),
    changePassword: (password: string) => request<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ password }) }),
    completeFirstAccess: (password: string) => request<{ message: string; user: any }>('/auth/complete-first-access', { method: 'POST', body: JSON.stringify({ password }) }),
  },

  tickets: {
    list: (params?: { status?: string; category?: string; priority?: string; search?: string; studentId?: string }) => {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.category) query.set('category', params.category)
      if (params?.priority) query.set('priority', params.priority)
      if (params?.search) query.set('search', params.search)
      if (params?.studentId) query.set('studentId', params.studentId)
      const qs = query.toString()
      return request<Ticket[]>(`/tickets${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => request<Ticket>(`/tickets/${id}`),
    create: (data: { title: string; description: string; category: string; priority?: string; tags?: string[]; conversationId?: string; files?: File[] }) => {
      const { files, ...fields } = data
      const form = new FormData()
      for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, typeof value === 'string' ? value : JSON.stringify(value))
      files?.forEach(file => form.append('files', file))
      return request<Ticket>('/tickets', { method: 'POST', body: files?.length ? form : JSON.stringify(fields) })
    },
    update: (id: string, data: Partial<Ticket>) =>
      request<Ticket>(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    addMessage: (id: string, data: { content: string; isInternal?: boolean; files?: File[] }) => {
      const { files, ...fields } = data
      const form = new FormData()
      for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, String(value))
      files?.forEach(file => form.append('files', file))
      return request<any>(`/tickets/${id}/messages`, { method: 'POST', body: files?.length ? form : JSON.stringify(fields) })
    },
    downloadAttachment: async (ticketId: string, attachmentId: string, filename: string): Promise<void> => {
      const response = await fetch(getFullUrl(`/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(attachmentId)}/download`), { headers: getAuthHeaders() })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Não foi possível baixar o anexo.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
  },

  chat: {
    getConversations: () => request<any[]>('/chat/conversations'),
    getConversation: (id: string) => request<any>(`/chat/conversations/${id}`),
    createConversation: (title?: string) =>
      request<any>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    sendMessage: (conversationId: string, content: string, files: File[] = []) => {
      const form = new FormData()
      form.append('content', content)
      files.forEach(file => form.append('files', file))
      return request<{ userMessage: any; aiMessage: any }>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST', body: files.length ? form : JSON.stringify({ content }),
      })
    },
    downloadAttachment: async (conversationId: string, messageId: string, attachmentId: string, filename: string) => {
      const path = `/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}/download`
      const response = await fetch(getFullUrl(path), { headers: getAuthHeaders() })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Não foi possível baixar o anexo.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = filename
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    sendFeedback: (data: {
      conversationId?: string
      messageId?: string
      type: 'positive' | 'negative'
      comment?: string
    }) =>
      request<any>('/chat/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  kb: {
    list: (params?: { category?: string; search?: string }) => {
      const query = new URLSearchParams()
      if (params?.category) query.set('category', params.category)
      if (params?.search) query.set('search', params.search)
      const qs = query.toString()
      return request<any[]>(`/knowledge-base${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => request<any>(`/knowledge-base/${id}`),
    upload: (formData: FormData) =>
      request<any>('/kb/upload', {
        method: 'POST',
        body: formData,
      }),
    search: (query: string) =>
      request<any[]>(`/kb/search?q=${encodeURIComponent(query)}`),
    create: (data: any) =>
      request<any>('/knowledge-base', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/knowledge-base/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/knowledge-base/${id}`, {
        method: 'DELETE',
      }),
    downloadOriginal: (id: string) => downloadFile(`/knowledge-base/${encodeURIComponent(id)}/download`),
  },

  students: {
    documents: (id: string) => request<any[]>(`/students/${id}/documents`),
    updateContact: (id: string, phone: string | null) => request<{id:string;phone:string|null}>(`/students/${id}/contact`, {method:'PATCH',body:JSON.stringify({phone})}),
    list: (params?: { search?: string; course?: string; status?: string }) => {
      const query = new URLSearchParams()
      if (params?.search) query.set('search', params.search)
      if (params?.course) query.set('course', params.course)
      if (params?.status) query.set('status', params.status)
      const qs = query.toString()
      return request<any[]>(`/students${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => request<any>(`/students/${id}`),
  },

  metrics: {
    overview: (period?: number | { start: string; end: string }) => {
      const query = new URLSearchParams()
      if (typeof period === 'number') query.set('days', String(period))
      else if (period) { query.set('start', period.start); query.set('end', period.end) }
      return request<any>(`/metrics/overview${query.size ? `?${query}` : ''}`)
    },
    queue: () => request<any[]>('/metrics/queue'),
  },

  admin: {
    getHealth: () => request<any>('/admin/health'),
    getSLARules: () => request<any[]>('/admin/sla-rules'),
    getSLAMonitor: () => request<any[]>('/admin/sla-monitor'),
    updateSLARule: (id: string, data: any) => request<any>(`/admin/sla-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    createSLARule: (data: any) =>
      request<any>('/admin/sla-rules', { method: 'POST', body: JSON.stringify(data) }),
    getAutomations: () => request<any[]>('/admin/automations'),
    createAutomation: (data: any) =>
      request<any>('/admin/automations', { method: 'POST', body: JSON.stringify(data) }),
    getAuditLogs: (params?: { limit?: number; action?: string }) => {
      const query = new URLSearchParams()
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.action) query.set('action', params.action)
      const qs = query.toString()
      return request<any[]>(`/admin/audit-logs${qs ? `?${qs}` : ''}`)
    },
    getPrompts: () => request<any[]>('/admin/prompts'),
    updatePrompt: (id: string, data: any) =>
      request<any>(`/admin/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getBanners: () => request<any[]>('/admin/banners'),
    createBanner: (data: FormData) => request<any>('/admin/banners', { method: 'POST', body: data }),
    updateBanner: (id: string, data: FormData) => request<any>(`/admin/banners/${id}`, { method: 'PUT', body: data }),
    deleteBanner: (id: string) => request<void>(`/admin/banners/${id}`, { method: 'DELETE' }),
    getIntegrations: () => request<any[]>('/admin/integrations'),
getUsers: (role?: string) => {
      const qs = role ? `?role=${role}` : ''
      return request<any[]>(`/admin/users${qs}`)
    },
    createUser: (data: { name: string; email: string; password?: string; role?: string; department?: string }) =>
      request<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUserStatus: (id: string, status: string) =>
      request<any>(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getDashboardStats: () => request<{
      totalStudents: number
      totalAsa: number
      activeAsa: number
      totalTickets: number
      openTickets: number
      resolvedTickets: number
      slaRiskTickets: number
      appointmentsCount: number
      pieData: { name: string; value: number; color: string }[]
      chartData: { name: string; abertos: number; resolvidos: number }[]
      teamStatus: { id: string; name: string; email: string; avatar: string; status: string; lastAccess: string; tickets: number }[]
      recentAuditEvents: { id: string; userName: string; action: string; createdAt: string; details?: string; severity: string }[]
      systemHealth: { label: string; status: string; color: string }[]
    }>('/admin/dashboard-stats'),
    getStudents: (params?: { search?: string; course?: string; status?: string; period?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams()
      if (params?.search) query.set('search', params.search)
      if (params?.course) query.set('course', params.course)
      if (params?.status) query.set('status', params.status)
      if (params?.period) query.set('period', params.period)
      if (params?.page) query.set('page', String(params.page))
      if (params?.limit) query.set('limit', String(params.limit))
      const qs = query.toString()
      return request<{
        students: any[]
        total: number
        page: number
        totalPages: number
        summary?: { total: number; regular: number; irregular: number; trancado: number }
        courses?: string[]
      }>(`/admin/students${qs ? `?${qs}` : ''}`)
    },
    createStudent: (data: any) =>
      request<any>('/admin/students', { method: 'POST', body: JSON.stringify(data) }),
    updateStudentStatus: (id: string, status: string) =>
      request<any>(`/admin/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    runAIAnalysis: () =>
      request<{
        id: string
        summary: string
        healthScore: number
        diagnostics: string[]
        recommendations: Array<{
          priority: 'alta' | 'media' | 'baixa'
          title: string
          description: string
          impact: string
          category: string
        }>
        metricsSnapshot: any
        createdAt: string
      }>('/admin/ai-analysis', { method: 'POST' }),
    getAIAnalysisHistory: () =>
      request<Array<{
        id: string
        summary: string
        healthScore: number
        diagnostics: string[]
        recommendations: Array<{
          priority: 'alta' | 'media' | 'baixa'
          title: string
          description: string
          impact: string
          category: string
        }>
        metricsSnapshot: any
        createdAt: string
      }>>('/admin/ai-analysis/history'),
    getFeedback: () =>
      request<{
        positiveCount: number
        negativeCount: number
        totalCount: number
        positiveRate: number
        negativeRate: number
        feedbacks: Array<{
          id: string
          studentId?: string
          studentName: string
          conversationId?: string
          messageId?: string
          type: 'positive' | 'negative'
          snippet: string
          comment?: string
          rating?: number
          createdAt: string
          student?: { id: string; name: string; ra: string; email: string } | null
        }>
      }>('/admin/feedback'),
    markAllNotificationsRead: () => request<{count:number}>('/admin/notifications/read-all', {method:'PATCH'}),
    getNotifications: () => request<any[]>('/admin/notifications'),
    markNotificationRead: (id: string) =>
      request<any>(`/admin/notifications/${id}/read`, { method: 'PATCH' }),
  },

  appointments: {
    list: (params?: { date?: string; status?: string; search?: string; studentId?: string }) => {
      const query = new URLSearchParams()
      if (params?.date) query.set('date', params.date)
      if (params?.status) query.set('status', params.status)
      if (params?.search) query.set('search', params.search)
      if (params?.studentId) query.set('studentId', params.studentId)
      const qs = query.toString()
      return request<any[]>(`/appointments${qs ? `?${qs}` : ''}`)
    },
    my: () => request<any[]>('/appointments/my'),
    slots: (date?: string) => {
      const qs = date ? `?date=${encodeURIComponent(date)}` : ''
      return request<{
        date: string
        slots: { time: string; available: boolean; bookedCount: number; alreadyBookedByYou: boolean }[]
        userAlreadyHasBookingOnDate?: boolean
        userAppointmentOnDate?: { time: string; protocol: string } | null
      }>(`/appointments/slots${qs}`)
    },
    metrics: () => request<{ total: number; todayCount: number; inProgressCount: number; completedCount: number; cancelledCount: number; attendanceRate: number }>('/appointments/metrics'),
    get: (id: string) => request<any>(`/appointments/${id}`),
    create: (data: {
      subject: string
      date: string
      time: string
      notes?: string
      studentId?: string
      studentName?: string
      studentRa?: string
      studentEmail?: string
      studentCourse?: string
      documentName?: string
      documentType?: string
      documentSize?: string
      documentData?: string
    }) =>
      request<any>('/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string, resolutionNotes?: string) =>
      request<any>(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, resolutionNotes }),
      }),
    getDocument: (id: string) => request<{ name: string; type: string; size: string; dataUrl: string }>(`/appointments/${id}/document`),
    downloadIcs: (id: string) => downloadFile(`/appointments/${encodeURIComponent(id)}/ics`),
    download: (id: string) => downloadFile(`/appointments/${encodeURIComponent(id)}/download`),
  },
}
