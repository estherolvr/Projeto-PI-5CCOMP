import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, JWT_SECRET, requireRole } from '../middleware/auth'

export const documentRouter = Router()
const signingSecret=()=>process.env.DOCUMENT_SIGNING_SECRET?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||JWT_SECRET
const hasActiveEnrollment=(status:unknown)=>!['trancado','inativo'].includes(String(status||'').trim().toLowerCase())

documentRouter.post('/enrollment-declaration', authenticateToken, requireRole(['aluno']), async (req:AuthenticatedRequest,res) => {
  const secret=signingSecret()
  if (!secret) return res.status(503).json({error:'Emissão digital temporariamente indisponível.'})
  const student=await prisma.student.findUnique({where:{id:req.user!.id},select:{id:true,name:true,ra:true,course:true,semester:true,period:true,status:true}})
  if(!student) return res.status(404).json({error:'Cadastro acadêmico não encontrado.'})
  if(!hasActiveEnrollment(student.status)) return res.status(409).json({error:'A declaração está disponível apenas para matrículas vigentes.'})
  const issuedAt=new Date().toISOString()
  const protocol=`IAL-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`
  const payload={type:'enrollment-declaration',studentId:student.id,name:student.name,ra:student.ra,course:student.course,semester:student.semester,period:student.period,issuedAt,protocol}
  const token=jwt.sign(payload,secret,{expiresIn:'365d',issuer:'ialvaro.fecap',audience:'document-validation'})
  res.json({...payload,token})
})

documentRouter.get('/verify', async (req,res) => {
  const secret=signingSecret()
  if(!secret) return res.status(503).json({valid:false,error:'Validação digital temporariamente indisponível.'})
  try{
    const token=String(req.query.token||'')
    const payload=jwt.verify(token,secret,{issuer:'ialvaro.fecap',audience:'document-validation'}) as any
    if(payload.type!=='enrollment-declaration') throw new Error('Tipo inválido')
    const student=await prisma.student.findUnique({where:{id:String(payload.studentId)},select:{status:true,ra:true}})
    if(!student||!hasActiveEnrollment(student.status)||student.ra!==payload.ra) return res.status(410).json({valid:false,error:'Documento revogado ou matrícula não vigente.'})
    res.json({valid:true,document:{type:'Declaração de Matrícula',name:payload.name,ra:payload.ra,course:payload.course,semester:payload.semester,period:payload.period,issuedAt:payload.issuedAt,protocol:payload.protocol}})
  }catch{return res.status(400).json({valid:false,error:'Código de validação inválido ou expirado.'})}
})
