import { AuthenticationServiceError, InstitutionalAccessError, supabaseRequest, findInstitutionalUser } from '../services/supabase-auth'
import { Router } from 'express'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth'

export const authRouter = Router()

const productionAppUrl = 'https://alvaro-ai.joao-fsantana.workers.dev/'

function passwordRecoveryRedirect() {
  try {
    const configured = new URL(process.env.AUTH_REDIRECT_URL || productionAppUrl)
    const localHost = ['localhost', '127.0.0.1', '::1'].includes(configured.hostname)
    if (process.env.NODE_ENV === 'production' && localHost) return new URL('/reset-password', productionAppUrl).toString()
    return new URL('/reset-password', configured).toString()
  } catch {
    return new URL('/reset-password', productionAppUrl).toString()
  }
}

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
  } catch (error) {
    if (error instanceof AuthenticationServiceError && error.statusCode !== 401) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    if (error instanceof InstitutionalAccessError) {
      return res.status(403).json({ error: error.message })
    }
    return res.status(401).json({ error: 'E-mail ou senha inválidos, ou usuário sem acesso institucional.' })
  }
})

authRouter.post('/recover-password', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!email) return res.status(400).json({ error: 'Informe o e-mail institucional.' })
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Serviço de autenticação indisponível.' })
  try {
    await supabaseRequest('recover', { method: 'POST', body: JSON.stringify({ email, redirect_to: passwordRecoveryRedirect() }) })
    return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.' })
  } catch (error) {
    if (error instanceof AuthenticationServiceError && [429, 503].includes(error.statusCode)) return res.status(error.statusCode).json({ error: error.message })
    return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.' })
  }
})

authRouter.post('/reset-password', async (req, res) => {
  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!accessToken) return res.status(400).json({ error: 'Link de recuperação inválido ou expirado.' })
  if (password.length < 8) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' })
  try {
    await supabaseRequest('user', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ password }) })
    return res.json({ message: 'Senha redefinida com sucesso.' })
  } catch (error) {
    if (error instanceof AuthenticationServiceError && error.statusCode === 503) return res.status(503).json({ error: error.message })
    return res.status(400).json({ error: 'Link de recuperação inválido ou expirado.' })
  }
})

authRouter.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (password.length < 8) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' })
  const accessToken = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''))?.[1]
  if (!accessToken) return res.status(401).json({ error: 'Sessão inválida.' })
  try {
    await supabaseRequest('user', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ password }) })
    return res.json({ message: 'Senha alterada com sucesso.' })
  } catch (error) {
    if (error instanceof AuthenticationServiceError) return res.status(error.statusCode).json({ error: error.message })
    return res.status(500).json({ error: 'Não foi possível alterar a senha.' })
  }
})

authRouter.post('/complete-first-access', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (password.length < 8) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' })
  if (!req.user?.mustChangePassword) return res.status(409).json({ error: 'A troca obrigatória de senha já foi concluída.' })
  const accessToken = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''))?.[1]
  if (!accessToken) return res.status(401).json({ error: 'Sessão inválida.' })

  try {
    await supabaseRequest('user', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ password }),
    })

    await prisma.$transaction(async tx => {
      const resource = req.user!.role === 'aluno' ? 'Student' : 'User'
      await tx.auditEvent.deleteMany({ where: { action: 'PRIMEIRO_ACESSO_PENDENTE', resource, resourceId: req.user!.id } })
      await tx.auditEvent.create({ data: {
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CONCLUIU_PRIMEIRO_ACESSO',
        resource: req.user!.role === 'aluno' ? 'Student' : 'User',
        resourceId: req.user!.id,
        details: JSON.stringify({ passwordChanged: true }),
        severity: 'info',
      } })
    })

    const user = await findInstitutionalUser(req.user.email)
    return res.json({ message: 'Nova senha definida com sucesso.', user })
  } catch (error) {
    if (error instanceof AuthenticationServiceError) return res.status(error.statusCode).json({ error: error.message })
    console.error('Erro ao concluir primeiro acesso:', error)
    return res.status(500).json({ error: 'Não foi possível concluir a troca obrigatória de senha.' })
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
          mustChangePassword: req.user.mustChangePassword,
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
        mustChangePassword: req.user.mustChangePassword,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    res.status(500).json({ error: 'Erro interno ao buscar perfil' })
  }
})
