import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, JWT_SECRET, requireRole } from '../middleware/auth'

export const documentRouter = Router()

documentRouter.post('/enrollment-declaration', authenticateToken, requireRole(['aluno']), async (req:AuthenticatedRequest,res) => {
  if (!JWT_SECRET) return res.status(503).json({error:'Emissão digital temporariamente indisponível.'})
  const student=await prisma.student.findUnique({where:{id:req.user!.id},select:{id:true,name:true,ra:true,course:true,semester:true,period:true,status:true}})
  if(!student) return res.status(404).json({error:'Cadastro acadêmico não encontrado.'})
  if(student.status!=='ativo') return res.status(409).json({error:'A declaração está disponível apenas para matrículas ativas.'})
  const issuedAt=new Date().toISOString()
  const protocol=`IAL-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`
  const payload={type:'enrollment-declaration',studentId:student.id,name:student.name,ra:student.ra,course:student.course,semester:student.semester,period:student.period,issuedAt,protocol}
  const token=jwt.sign(payload,JWT_SECRET,{expiresIn:'365d',issuer:'ialvaro.fecap',audience:'document-validation'})
  res.json({...payload,token})
})

documentRouter.get('/verify', async (req,res) => {
  if(!JWT_SECRET) return res.status(503).json({valid:false,error:'Validação digital temporariamente indisponível.'})
  try{
    const token=String(req.query.token||'')
    const payload=jwt.verify(token,JWT_SECRET,{issuer:'ialvaro.fecap',audience:'document-validation'}) as any
    if(payload.type!=='enrollment-declaration') throw new Error('Tipo inválido')
    const student=await prisma.student.findUnique({where:{id:String(payload.studentId)},select:{status:true,ra:true}})
    if(!student||student.status!=='ativo'||student.ra!==payload.ra) return res.status(410).json({valid:false,error:'Documento revogado ou matrícula inativa.'})
    res.json({valid:true,document:{type:'Declaração de Matrícula',name:payload.name,ra:payload.ra,course:payload.course,semester:payload.semester,period:payload.period,issuedAt:payload.issuedAt,protocol:payload.protocol}})
  }catch{return res.status(400).json({valid:false,error:'Código de validação inválido ou expirado.'})}
})
