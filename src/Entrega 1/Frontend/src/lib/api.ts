import type { Ticket, TicketCategory, TicketPriority, TicketStatus, UserRole } from './mock-data'

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('asaia_auth_token') : null
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
        localStorage.removeItem('asaia_auth_token')
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/') {
          window.location.href = '/login'
        }
      }
    }
    const errorData = await response.json().catch(() => ({}))
    const statusMsg = response.status === 401 ? 'Sessão expirada ou não autenticada. Faça login novamente.' : (response.statusText || `Código HTTP ${response.status}`)
    throw new Error(errorData.error || errorData.message || statusMsg)
  }

  return response.json()
}

export const api = {
  auth: {
    login: (email: string, password?: string) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    demoLogin: (role: UserRole) =>
      request<{ token: string; user: any }>('/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
    me: () => request<{ user: any }>('/auth/me'),
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
    create: (data: { title: string; description: string; category: string; priority?: string; tags?: string[]; conversationId?: string }) =>
      request<Ticket>('/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Ticket>) =>
      request<Ticket>(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    addMessage: (id: string, data: { content: string; isInternal?: boolean; attachments?: any[] }) =>
      request<any>(`/tickets/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  chat: {
    getConversations: () => request<any[]>('/chat/conversations'),
    getConversation: (id: string) => request<any>(`/chat/conversations/${id}`),
    createConversation: (title?: string) =>
      request<any>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    sendMessage: (conversationId: string, content: string) =>
      request<{ userMessage: any; aiMessage: any }>(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    sendFeedback: (data: {
      conversationId?: string
      messageId?: string
      type: 'positive' | 'negative'
      snippet: string
      comment?: string
      rating?: number
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
    getDownloadUrl: (id: string) => getFullUrl(`/knowledge-base/${id}/download`),
  },

  students: {
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
    overview: (days?: number) => request<any>(`/metrics/overview${days ? `?days=${days}` : ''}`),
    queue: () => request<any[]>('/metrics/queue'),
  },

  admin: {
    getHealth: () => request<any>('/admin/health'),
    getSLARules: () => request<any[]>('/admin/sla-rules'),
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
        }>
      }>('/admin/feedback'),
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
    getIcsUrl: (id: string) => getFullUrl(`/appointments/${id}/ics`),
    getDownloadUrl: (id: string) => getFullUrl(`/appointments/${id}/download`),
  },
}
