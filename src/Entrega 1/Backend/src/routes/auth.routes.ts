import { supabaseRequest, findInstitutionalUser } from '../services/supabase-auth'
import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'Email institucional é obrigatório' })
  if (typeof password !== 'string' || !password) return res.status(400).json({ error: 'Senha é obrigatória' })
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Serviço de autenticação indisponível.' })
  try {
    const session = await supabaseRequest('token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    const user = await findInstitutionalUser(session.user.email)
    return res.json({ token: session.access_token, user })
  } catch {
    return res.status(401).json({ error: 'E-mail ou senha inválidos, ou usuário sem acesso institucional.' })
  }
})

// Kept as an explicit denial so old clients cannot obtain a simulated session.
authRouter.post('/demo-login', (_req, res) => res.status(403).json({ error: 'Acesso de demonstração desativado.' }))

authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.role === 'aluno') {
      const student = await prisma.student.findUnique({
        where: { id: req.user.id },
      })
      if (!student) return res.status(404).json({ error: 'Cadastro de aluno não encontrado.' })
      return res.json({
        user: {
          id: req.user.id,
          name: student?.name || req.user.name,
          email: student?.email || req.user.email,
          role: 'aluno',
          ra: student?.ra,
          course: student?.course,
          semester: student?.semester,
          period: student?.period,
          status: student?.status,
          phone: student?.phone,
        },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        status: user.status,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    res.status(500).json({ error: 'Erro interno ao buscar perfil' })
  }
})
