import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth'

export const studentRouter = Router()

// List students
studentRouter.get('/', authenticateToken, requireRole(['admin', 'asa']), async (req: AuthenticatedRequest, res) => {
  try {
    const { search, course, status, period } = req.query

    const where: any = {}

    if (course && course !== 'todos') {
      where.course = String(course)
    }

    if (status && status !== 'todos') {
      where.status = String(status)
    }

    if (period && period !== 'todos') {
      where.period = String(period)
    }

    if (search) {
      const q = String(search).toLowerCase()
      where.OR = [
        { name: { contains: q } },
        { ra: { contains: q } },
        { email: { contains: q } },
        { course: { contains: q } },
      ]
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    res.json(students)
  } catch (error) {
    console.error('Erro ao listar estudantes:', error)
    res.status(500).json({ error: 'Erro ao buscar estudantes' })
  }
})

// Documents are actual files associated with the student's own appointments/tickets.
studentRouter.get('/:id/documents', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id)
  if (req.user?.role === 'aluno' && req.user.id !== id) return res.status(403).json({ error: 'Você só pode consultar seus próprios documentos.' })
  try {
    if (!await prisma.student.findUnique({ where: { id } })) return res.status(404).json({ error: 'Aluno não encontrado.' })
    const [appointments, attachments] = await Promise.all([
      prisma.appointment.findMany({ where: { studentId: id, documentName: { not: null }, OR: [{ r2Key: { not: null } }, { documentData: { not: null } }] }, select: { id:true,documentName:true,documentType:true,documentSize:true,createdAt:true } }),
      prisma.attachment.findMany({ where: { message: { ticket: { studentId: id } } }, select: { id:true,name:true,type:true,size:true,url:true,createdAt:true } }),
    ])
    res.json([
      ...appointments.map(a => ({ id:a.id,name:a.documentName,type:a.documentType,size:a.documentSize,createdAt:a.createdAt,source:'Agendamento',url:`/api/appointments/${a.id}/download` })),
      ...attachments.filter(a => a.url.startsWith('https://') || a.url.startsWith('/api/')).map(a => ({ ...a,source:'Chamado' })),
    ].sort((a,b) => new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()))
  } catch {res.status(500).json({ error:'Não foi possível consultar os documentos.' })}
})

studentRouter.patch('/:id/contact', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const id=String(req.params.id)
  if (req.user?.id!==id && req.user?.role!=='admin') return res.status(403).json({ error:'Você só pode alterar seu próprio contato.' })
  const phone=req.body.phone
  if (phone!==null && (typeof phone!=='string' || phone.length>30 || (phone && !/^[+()\d\s-]{7,30}$/.test(phone)))) return res.status(400).json({error:'Informe um telefone válido ou deixe o campo vazio.'})
  try {
    if (!await prisma.student.findUnique({where:{id}})) return res.status(404).json({error:'Aluno não encontrado.'})
    const student=await prisma.student.update({where:{id},data:{phone:phone?.trim()||null}})
    res.json({id:student.id,phone:student.phone})
  } catch {res.status(500).json({error:'Não foi possível salvar o contato.'})}
})

// Get single student by ID with tickets
studentRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    if (req.user?.role === 'aluno' && req.user.id !== id) {
      return res.status(403).json({ error: 'Você só pode consultar seu próprio cadastro.' })
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            attendant: { select: { id: true, name: true, email: true } },
            aiSuggestion: req.user?.role !== 'aluno',
          },
        },
        conversations: {
          orderBy: { updatedAt: 'desc' },
          include: { messages: true },
        },
      },
    })

    if (!student) {
      return res.status(404).json({ error: 'Estudante não encontrado' })
    }

    res.json(student)
  } catch (error) {
    console.error('Erro ao buscar estudante:', error)
    res.status(500).json({ error: 'Erro ao buscar estudante' })
  }
})
