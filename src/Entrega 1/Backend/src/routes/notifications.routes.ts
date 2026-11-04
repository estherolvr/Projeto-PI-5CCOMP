import { Router } from 'express'
import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middleware/auth'
import { listUserNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notifications.service'

export const notificationsRouter = Router()
notificationsRouter.use(authenticateToken, requireRole(['aluno','asa','admin']))

notificationsRouter.get('/', async (req:AuthenticatedRequest,res)=>{
  try {res.json(await listUserNotifications(req.user!))}
  catch {res.status(500).json({error:'Não foi possível carregar as notificações.'})}
})
notificationsRouter.patch('/read-all', async (req:AuthenticatedRequest,res)=>{
  try {res.json(await markAllNotificationsRead(req.user!))}
  catch {res.status(500).json({error:'Não foi possível marcar todas as notificações como lidas.'})}
})
notificationsRouter.patch('/:id/read', async (req:AuthenticatedRequest,res)=>{
  try {
    const id=String(req.params.id)
    if(id.length>300)return res.status(400).json({error:'Identificador de notificação inválido.'})
    const notification=await markNotificationRead(req.user!,id)
    if(!notification)return res.status(404).json({error:'Notificação não encontrada para este usuário.'})
    res.json(notification)
  }catch{res.status(500).json({error:'Não foi possível marcar a notificação como lida.'})}
})
