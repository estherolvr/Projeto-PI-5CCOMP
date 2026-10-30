import { prisma } from './db'
import { r2Service } from './services/r2.service'
import {
  mockUsers,
  mockStudents,
  mockTickets,
  mockMessages,
  mockConversations,
  mockKBDocuments,
  mockSLARules,
  mockAutomations,
  mockAuditEvents,
  mockPrompts,
  mockIntegrations,
  mockNotifications,
  mockAppointments,
} from './mock-data'

export async function seedDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed de demonstração desabilitado em produção.')
  }
  const existingRecords = await Promise.all([
    prisma.user.count(), prisma.student.count(), prisma.ticket.count(),
    prisma.kBDocument.count(), prisma.appointment.count(), prisma.conversation.count(),
    prisma.auditEvent.count(), prisma.sLARule.count(), prisma.automationRule.count(),
    prisma.aIPrompt.count(), prisma.integration.count(), prisma.notification.count(),
    prisma.aIFeedback.count(), prisma.adminAIReport.count(),
  ])
  if (existingRecords.some(count => count > 0)) {
    throw new Error('Seed permitido apenas em banco vazio de desenvolvimento. Nenhum registro existente foi alterado.')
  }
  console.log('Criando dados de demonstração em banco vazio de desenvolvimento...')

  // 1. Users
  console.log('Criando usuários...')
  for (const user of mockUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        password: '@#$273baratA',
        role: user.role,
        department: user.department,
        status: user.status,
        lastAccess: new Date(user.lastAccess || Date.now()),
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: '@#$273baratA',
        role: user.role,
        department: user.department,
        status: user.status,
        avatar: user.avatar,
        lastAccess: new Date(user.lastAccess || Date.now()),
        createdAt: new Date(user.createdAt || Date.now()),
      },
    })
  }

  // 2. Students
  console.log('Criando estudantes...')
  for (const st of mockStudents) {
    await prisma.student.upsert({
      where: { id: st.id },
      update: {
        name: st.name,
        ra: st.ra,
        email: st.email,
        course: st.course,
        semester: st.semester,
        period: st.period,
        status: st.status,
        phone: st.phone,
      },
      create: {
        id: st.id,
        name: st.name,
        ra: st.ra,
        email: st.email,
        course: st.course,
        semester: st.semester,
        period: st.period,
        status: st.status,
        phone: st.phone,
        createdAt: new Date(st.createdAt || Date.now()),
      },
    })
  }

  // 3. Tickets & AI Analysis
  console.log('Criando chamados e análises de IA...')
  for (const ticket of mockTickets) {
    const createdTicket = await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {
        number: ticket.number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        studentId: ticket.studentId,
        assignedTo: ticket.assignedTo || null,
        slaDeadline: new Date(ticket.slaDeadline || Date.now() + 86400000),
        slaStatus: ticket.slaStatus || 'ok',
        tags: JSON.stringify(ticket.tags || []),
      },
      create: {
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        studentId: ticket.studentId,
        assignedTo: ticket.assignedTo || null,
        createdAt: new Date(ticket.createdAt || Date.now()),
        updatedAt: new Date(ticket.updatedAt || Date.now()),
        slaDeadline: new Date(ticket.slaDeadline || Date.now() + 86400000),
        slaStatus: ticket.slaStatus || 'ok',
        tags: JSON.stringify(ticket.tags || []),
      },
    })

    if (ticket.aiSuggestion) {
      await prisma.aIAnalysis.upsert({
        where: { ticketId: createdTicket.id },
        update: {
          intent: ticket.aiSuggestion.intent,
          category: ticket.aiSuggestion.category,
          priority: ticket.aiSuggestion.priority,
          summary: ticket.aiSuggestion.summary,
          confidence: ticket.aiSuggestion.confidence,
          recommendation: ticket.aiSuggestion.recommendation,
          sentiment: ticket.aiSuggestion.sentiment,
        },
        create: {
          ticketId: createdTicket.id,
          intent: ticket.aiSuggestion.intent,
          category: ticket.aiSuggestion.category,
          priority: ticket.aiSuggestion.priority,
          summary: ticket.aiSuggestion.summary,
          confidence: ticket.aiSuggestion.confidence,
          recommendation: ticket.aiSuggestion.recommendation,
          sentiment: ticket.aiSuggestion.sentiment,
        },
      })
    }
  }

  // 4. Messages
  console.log('Criando mensagens dos chamados...')
  for (const msg of mockMessages) {
    if (!msg.ticketId) continue

    const existingMsg = await prisma.ticketMessage.findUnique({
      where: { id: msg.id },
    })

    if (!existingMsg) {
      const senderRole = (msg as any).senderRole || (msg as any).sender || 'aluno'
      const senderId = senderRole === 'aluno' ? 'aluno-01' : senderRole === 'asa' ? 'asa-01' : 'admin-01'

      const createdMsg = await prisma.ticketMessage.create({
        data: {
          id: msg.id,
          ticketId: msg.ticketId,
          senderId: senderId,
          senderName: msg.senderName || 'Atendente',
          senderRole: senderRole,
          content: msg.content,
          isInternal: false,
          createdAt: new Date(msg.timestamp || Date.now()),
        },
      })

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          await prisma.attachment.create({
            data: {
              id: att.id,
              messageId: createdMsg.id,
              name: att.name,
              size: String(att.size || '1MB'),
              type: att.type,
              url: att.url,
            },
          })
        }
      }
    }
  }

  // 5. Conversations & ChatMessages
  console.log('Criando conversas de chat com IA...')
  for (const conv of mockConversations) {
    const existingConv = await prisma.conversation.findUnique({
      where: { id: conv.id },
    })

    if (!existingConv) {
      await prisma.conversation.create({
        data: {
          id: conv.id,
          studentId: conv.studentId,
          title: conv.title,
          createdAt: new Date((conv as any).createdAt || Date.now()),
          updatedAt: new Date((conv as any).updatedAt || Date.now()),
          messages: {
            create: conv.messages.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              actions: m.actions ? JSON.stringify(m.actions) : null,
              timestamp: new Date(m.timestamp || Date.now()),
            })),
          },
        },
      })
    }
  }

  // 6. Knowledge Base Documents
  console.log('Criando base de conhecimento...')
  for (const kb of mockKBDocuments) {
    let r2Key: string | null = (kb as any).r2Key || null
    if (r2Service.isConfigured() && kb.content) {
      try {
        const key = `kb/${kb.id}/manual_estudante_fecap.txt`
        await r2Service.uploadBuffer(key, Buffer.from(kb.content, 'utf-8'), 'text/plain')
        r2Key = key
        console.log(`☁️ Documento KB seed sincronizado no Cloudflare R2: ${key}`)
      } catch (e: any) {
        console.warn('Falha no upload seed KB para R2:', e.message)
      }
    }

    await prisma.kBDocument.upsert({
      where: { id: kb.id },
      update: {
        title: kb.title,
        category: kb.category,
        content: kb.content,
        version: kb.version,
        status: kb.status,
        author: kb.author,
        tags: JSON.stringify(kb.tags || []),
        views: kb.views,
        indexed: kb.indexed ?? true,
        r2Key: r2Key,
      },
      create: {
        id: kb.id,
        title: kb.title,
        category: kb.category,
        content: kb.content,
        version: kb.version,
        status: kb.status,
        author: kb.author,
        tags: JSON.stringify(kb.tags || []),
        views: kb.views,
        indexed: kb.indexed ?? true,
        createdAt: new Date(kb.createdAt || Date.now()),
        updatedAt: new Date(kb.updatedAt || Date.now()),
      },
    })
  }

  // 7. SLA Rules
  console.log('Criando regras de SLA...')
  for (const rule of mockSLARules) {
    await prisma.sLARule.upsert({
      where: { id: rule.id },
      update: {
        name: rule.name,
        category: rule.category || null,
        priority: rule.priority,
        firstResponseMinutes: rule.firstResponseMinutes,
        resolutionHours: rule.resolutionHours,
        active: rule.active,
      },
      create: {
        id: rule.id,
        name: rule.name,
        category: rule.category || null,
        priority: rule.priority,
        firstResponseMinutes: rule.firstResponseMinutes,
        resolutionHours: rule.resolutionHours,
        active: rule.active,
      },
    })
  }

  // 8. Automations
  console.log('Criando automações...')
  for (const auto of mockAutomations) {
    await prisma.automationRule.upsert({
      where: { id: auto.id },
      update: {
        name: auto.name,
        description: auto.description,
        trigger: JSON.stringify(auto.trigger),
        conditions: JSON.stringify(auto.conditions),
        actions: JSON.stringify(auto.actions),
        active: auto.active,
        runs: auto.runs,
      },
      create: {
        id: auto.id,
        name: auto.name,
        description: auto.description,
        trigger: JSON.stringify(auto.trigger),
        conditions: JSON.stringify(auto.conditions),
        actions: JSON.stringify(auto.actions),
        active: auto.active,
        runs: auto.runs,
      },
    })
  }

  // 9. Audit Events
  console.log('Criando eventos de auditoria...')
  for (const evt of mockAuditEvents) {
    const existing = await prisma.auditEvent.findUnique({
      where: { id: evt.id },
    })
    if (!existing) {
      await prisma.auditEvent.create({
        data: {
          id: evt.id,
          userId: evt.userId || null,
          userName: evt.userName,
          userRole: evt.userRole,
          action: evt.action,
          resource: evt.resource || 'Chamado',
          resourceId: evt.resourceId || '#1000',
          details: evt.details || '',
          ip: evt.ip || '127.0.0.1',
          severity: evt.severity || 'info',
          createdAt: new Date(evt.timestamp || Date.now()),
        },
      })
    }
  }

  // 10. AI Prompts
  console.log('Criando prompts de IA...')
  for (const p of mockPrompts) {
    await prisma.aIPrompt.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        content: p.content,
        version: p.version,
        status: p.status,
        author: p.author,
        uses: p.uses,
        successRate: p.successRate,
      },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        content: p.content,
        version: p.version,
        status: p.status,
        author: p.author,
        uses: p.uses,
        successRate: p.successRate,
      },
    })
  }

  // 11. Integrations
  console.log('Criando integrações...')
  for (const intg of mockIntegrations) {
    await prisma.integration.upsert({
      where: { id: intg.id },
      update: {
        name: intg.name,
        description: intg.description,
        type: intg.type,
        status: intg.status,
        icon: intg.icon || 'plug',
        config: JSON.stringify(intg.config || {}),
        lastSync: new Date(intg.lastSync || Date.now()),
      },
      create: {
        id: intg.id,
        name: intg.name,
        description: intg.description,
        type: intg.type,
        status: intg.status,
        icon: intg.icon || 'plug',
        config: JSON.stringify(intg.config || {}),
        lastSync: new Date(intg.lastSync || Date.now()),
      },
    })
  }

  // 12. Notifications
  console.log('Criando notificações...')
  for (const notif of mockNotifications) {
    const existing = await prisma.notification.findUnique({
      where: { id: notif.id },
    })
    if (!existing) {
      await prisma.notification.create({
        data: {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          read: notif.read,
          priority: notif.priority || 'medium',
          link: notif.link,
          createdAt: new Date(notif.timestamp || Date.now()),
        },
      })
    }
  }

  // 13. Appointments (Agendamentos Presenciais ASA)
  console.log('Criando agendamentos presenciais do ASA...')
  for (const apt of mockAppointments) {
    let r2Key: string | null = (apt as any).r2Key || null
    const docName = apt.documentName || 'comprovante_matricula_fecap.txt'
    const sampleDocContent = `COMPROVANTE DE AGENDAMENTO PRESENCIAL ASA FECAP\nProtocolo: ${apt.protocol}\nAluno: ${apt.studentName} (RA: ${apt.studentRa})\nAssunto: ${apt.subject}\nData: ${apt.date} às ${apt.time}\nLocal: ${apt.location}\nStatus: ${apt.status}\n\nDocumento autenticado digitalmente e armazenado no Cloudflare R2.`

    if (r2Service.isConfigured()) {
      try {
        const key = `agendamentos/${apt.id}/${docName}`
        await r2Service.uploadBuffer(key, Buffer.from(sampleDocContent, 'utf-8'), 'text/plain')
        r2Key = key
        console.log(`☁️ Anexo do agendamento seed sincronizado no Cloudflare R2: ${key}`)
      } catch (e: any) {
        console.warn('Falha no upload seed agendamento para R2:', e.message)
      }
    }

    await prisma.appointment.upsert({
      where: { id: apt.id },
      update: {
        protocol: apt.protocol,
        studentId: apt.studentId,
        studentName: apt.studentName,
        studentRa: apt.studentRa,
        studentEmail: apt.studentEmail,
        studentCourse: apt.studentCourse,
        subject: apt.subject,
        date: apt.date,
        time: apt.time,
        durationMinutes: apt.durationMinutes || 30,
        location: apt.location,
        desk: apt.desk,
        notes: apt.notes,
        status: apt.status,
        attendantId: apt.attendantId || null,
        attendantName: apt.attendantName || null,
        resolutionNotes: (apt as any).resolutionNotes || null,
        googleCalendarLink: apt.googleCalendarLink || null,
        documentName: docName,
        documentType: "text/plain",
        documentSize: "2.4 KB",
        documentData: "data:text/plain;base64," + Buffer.from(sampleDocContent).toString("base64"),
        r2Key: r2Key,
      },
      create: {
        id: apt.id,
        protocol: apt.protocol,
        studentId: apt.studentId,
        studentName: apt.studentName,
        studentRa: apt.studentRa,
        studentEmail: apt.studentEmail,
        studentCourse: apt.studentCourse,
        subject: apt.subject,
        date: apt.date,
        time: apt.time,
        durationMinutes: apt.durationMinutes || 30,
        location: apt.location,
        desk: apt.desk,
        notes: apt.notes,
        status: apt.status,
        attendantId: apt.attendantId || null,
        attendantName: apt.attendantName || null,
        resolutionNotes: (apt as any).resolutionNotes || null,
        googleCalendarLink: apt.googleCalendarLink || null,
        documentName: docName,
        documentType: "text/plain",
        documentSize: "2.4 KB",
        documentData: "data:text/plain;base64," + Buffer.from(sampleDocContent).toString("base64"),
        r2Key: r2Key,
      },
    })
  }

  console.log('✅ Banco de Dados populado com sucesso!')
}

// Run standalone if executed directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .catch(err => {
      console.error('❌ Erro no seed:', err)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}
