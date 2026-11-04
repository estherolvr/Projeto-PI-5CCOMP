import { createHash } from 'node:crypto'
import { prisma } from '../db'
import type { AuthenticatedUser } from '../middleware/auth'
import { ACTIVE_TICKET_STATUSES } from './admin-metrics'
import { assignedSlaPolicies, evaluateTicketSla } from './ticket-sla'

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

const statusLabels: Record<string, string> = {
  aberto: 'Aberto', em_atendimento: 'Em atendimento', aguardando_aluno: 'Aguardando aluno',
  resolvido: 'Resolvido', fechado: 'Fechado', confirmado: 'Confirmado',
  cancelado: 'Cancelado', concluido: 'Concluído', ausente: 'Ausente',
}

/** The feed comes from existing business records. AuditEvent stores only the
 * user's read receipt, so a read never changes another user's unread state.
 * No notifications or receipts are written by GET requests.
 */
export async function listUserNotifications(user: AuthenticatedUser, now = new Date()): Promise<UserNotification[]> {
  const student = user.role === 'aluno'
  const prefix = student ? '/aluno' : user.role === 'asa' ? '/asa' : '/admin'
  const ticketLink = (id: string) => user.role === 'admin' ? '/admin/chamados' : `${prefix}/chamados/${encodeURIComponent(id)}`
  const scope = student ? { studentId: user.id } : {}
  const [tickets, messages, appointments] = await Promise.all([
    prisma.ticket.findMany({where: scope, select: {id:true,number:true,title:true,status:true,slaDeadline:true,createdAt:true,
      messages:{where:{senderRole:{in:['asa','admin']},isInternal:false},orderBy:{createdAt:'asc'},take:2,select:{createdAt:true,senderRole:true,isInternal:true}}}}),
    prisma.ticketMessage.findMany({
      where: {ticket:scope,isInternal:false,senderRole:student ? {in:['asa','admin']} : 'aluno',senderId:{not:user.id}},
      orderBy:[{createdAt:'desc'},{id:'desc'}],take:100,
      select:{id:true,ticketId:true,createdAt:true,ticket:{select:{number:true,title:true,messages:{orderBy:[{createdAt:'asc'},{id:'asc'}],take:1,select:{id:true}}}}},
    }),
    prisma.appointment.findMany({where:scope,orderBy:{updatedAt:'desc'},take:100,select:{id:true,protocol:true,subject:true,date:true,time:true,status:true,updatedAt:true}}),
  ])
  const ticketMap = new Map(tickets.flatMap(ticket => [[ticket.id,ticket],[`#${ticket.number}`,ticket]] as const))
  const audits = await prisma.auditEvent.findMany({
    where:{action:'ticket.updated',resource:'Chamado',...(student ? {resourceId:{in:[...ticketMap.keys()]}} : {})},
    orderBy:[{createdAt:'desc'},{id:'desc'}],take:100,
    select:{id:true,resourceId:true,details:true,createdAt:true},
  })
  const activeResources=tickets.filter(ticket=>ACTIVE_TICKET_STATUSES.includes(ticket.status)).flatMap(ticket=>[ticket.id,`#${ticket.number}`])
  const policyAudits=!student&&activeResources.length ? await prisma.auditEvent.findMany({
    where:{resource:'Chamado',resourceId:{in:activeResources},action:{in:['ticket.created','ticket.updated']}},
    orderBy:{createdAt:'asc'},select:{resourceId:true,details:true},
  }) : []
  const policies=assignedSlaPolicies(policyAudits)
  const notifications: UserNotification[] = []
  for (const ticket of tickets) {
    notifications.push({id:`ticket-created:${ticket.id}`,type:'new_ticket',title:student?'Chamado registrado':'Novo chamado',
      message:`#${ticket.number} · ${ticket.title}`,priority:'medium',link:ticketLink(ticket.id),createdAt:ticket.createdAt.toISOString(),read:false})
    if (!student && ACTIVE_TICKET_STATUSES.includes(ticket.status)) {
      const policy=policies.get(`#${ticket.number}`)||policies.get(ticket.id)
      const sla=evaluateTicketSla(ticket,policy,now)
      if (sla.resolutionStatus !== 'ok') {
        const breached=sla.resolutionStatus==='breached'
        notifications.push({id:`sla:${ticket.id}:${ticket.slaDeadline.getTime()}:${breached?'breached':'risk'}`,type:'sla_risk',
          title:breached?'Prazo de resolução ultrapassado':'Prazo de resolução próximo',message:`#${ticket.number} · ${ticket.title}`,
          priority:'high',link:ticketLink(ticket.id),createdAt:new Date(ticket.slaDeadline.getTime()-(breached?0:3_600_000)).toISOString(),read:false})
      }
      if (!sla.firstResponseAt && sla.firstResponseDeadline && ['risk','breached'].includes(sla.firstResponseStatus)) {
        const deadline=new Date(sla.firstResponseDeadline).getTime(),breached=sla.firstResponseStatus==='breached'
        const riskWindow=Math.min(3_600_000,(policy?.firstResponseMinutes||0)*60_000*0.2)
        notifications.push({id:`sla-first-response:${ticket.id}:${deadline}:${sla.firstResponseStatus}`,type:'sla_risk',
          title:breached?'Prazo de primeira resposta ultrapassado':'Prazo de primeira resposta próximo',
          message:`#${ticket.number} · ${ticket.title}`,priority:'high',link:ticketLink(ticket.id),
          createdAt:new Date(deadline-(breached?0:riskWindow)).toISOString(),read:false})
      }
    }
  }
  for (const message of messages) {
    if (!student && message.ticket.messages[0]?.id===message.id) continue // Description already represented by ticket-created.
    notifications.push({id:`ticket-message:${message.id}`,type:'ticket_message',title:student?'Nova resposta da equipe ASA':'Nova mensagem do aluno',
      message:`#${message.ticket.number} · ${message.ticket.title}`,priority:'medium',link:ticketLink(message.ticketId),createdAt:message.createdAt.toISOString(),read:false})
  }
  for (const audit of audits) {
    const ticket=ticketMap.get(audit.resourceId)
    if(!ticket)continue
    let status: unknown
    try{const details=JSON.parse(audit.details||'{}');if(details.status!==details.previousStatus)status=details.status}catch{continue}
    if(typeof status!=='string'||!statusLabels[status])continue
    notifications.push({id:`ticket-status:${audit.id}`,type:'ticket_updated',title:'Status do chamado atualizado',
      message:`#${ticket.number} · ${statusLabels[status]}`,priority:'medium',link:ticketLink(ticket.id),createdAt:audit.createdAt.toISOString(),read:false})
  }
  for(const appointment of appointments){
    notifications.push({id:`appointment:${appointment.id}:${appointment.updatedAt.getTime()}`,type:'appointment',title:'Agendamento presencial',
      message:`${appointment.protocol} · ${appointment.subject} · ${appointment.date.split('-').reverse().join('/')} às ${appointment.time} · ${statusLabels[appointment.status]||appointment.status}`,
      priority:'medium',link:student?'/aluno/agendamento':`${prefix}/agendamentos`,createdAt:appointment.updatedAt.toISOString(),read:false})
  }
  const recent=notifications.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id)).slice(0,100)
  const receipts=await prisma.auditEvent.findMany({where:{userId:user.id,action:'notification.read',resource:'Notification',resourceId:{in:['all',...recent.map(item=>item.id)]}},select:{resourceId:true,createdAt:true}})
  const read=new Set(receipts.map(receipt=>receipt.resourceId))
  const allReadAt=receipts.find(receipt=>receipt.resourceId==='all')?.createdAt.getTime() || 0
  return recent.map(item=>({...item,read:read.has(item.id)||new Date(item.createdAt).getTime()<=allReadAt}))
}

export async function markNotificationRead(user:AuthenticatedUser,id:string):Promise<UserNotification|null>{
  const notification=(await listUserNotifications(user)).find(item=>item.id===id)
  if(!notification)return null
  const receiptId='notification-read-'+createHash('sha256').update(JSON.stringify([user.id,id])).digest('hex')
  await prisma.auditEvent.upsert({where:{id:receiptId},update:{},create:{id:receiptId,userId:user.id,userName:user.name,userRole:user.role,
    action:'notification.read',resource:'Notification',resourceId:id,details:null,severity:'info'}})
  return {...notification,read:true}
}

export async function markAllNotificationsRead(user:AuthenticatedUser){
  const id='notification-read-all-'+createHash('sha256').update(user.id).digest('hex')
  const readAt=new Date()
  await prisma.auditEvent.upsert({where:{id},update:{createdAt:readAt},create:{id,userId:user.id,userName:user.name,userRole:user.role,action:'notification.read',resource:'Notification',resourceId:'all',createdAt:readAt,severity:'info'}})
  return {readAt:readAt.toISOString()}
}
