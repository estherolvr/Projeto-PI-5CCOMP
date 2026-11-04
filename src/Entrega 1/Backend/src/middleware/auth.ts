import { AuthenticationServiceError, InstitutionalAccessError, supabaseRequest, findInstitutionalUser } from '../services/supabase-auth'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET || ''

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: 'aluno' | 'asa' | 'admin'
  department?: string
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

/**
 * Middleware para validar o token JWT de autenticação.
 * Exige cabeçalho 'Authorization: Bearer <token>' válido.
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const bearer = typeof authHeader === 'string' ? /^Bearer\s+([^\s,]+)$/i.exec(authHeader.trim()) : null
  const token = bearer?.[1]

  if (!token) {
    return res.status(401).json({
      error: 'Acesso não autorizado. Token JWT não fornecido. Por favor, faça login.'
    })
  }

  if (process.env.APP_AUTH_PROVIDER === 'supabase' || process.env.NODE_ENV === 'production') {
    try {
      const identity = await supabaseRequest('user', { headers: { Authorization: `Bearer ${token}` } })
      req.user = await findInstitutionalUser(identity.email) as AuthenticatedUser
      return next()
    } catch (error) {
      if (error instanceof AuthenticationServiceError && error.statusCode !== 401) {
        return res.status(error.statusCode).json({ error: error.message })
      }
      if (error instanceof InstitutionalAccessError) {
        return res.status(403).json({ error: error.message })
      }
      return res.status(401).json({ error: 'Sessão expirada ou usuário sem acesso. Faça login novamente.' })
    }
  }

  try {
    if (!JWT_SECRET) return res.status(503).json({ error: 'Autenticação local não configurada.' })
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({
      error: 'Sessão expirada ou token inválido. Por favor, faça login novamente.'
    })
  }
}

/**
 * Middleware para autorização baseada em perfil (RBAC)
 */
export function requireRole(allowedRoles: Array<'aluno' | 'asa' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso proibido: você não possui permissão para acessar este recurso institucional.'
      })
    }
    next()
  }
}
