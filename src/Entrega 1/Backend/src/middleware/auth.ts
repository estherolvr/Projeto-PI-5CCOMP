import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET || 'alvaro-ai-super-secret-jwt-key-2026-fecap'

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
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = (authHeader && authHeader.split(' ')[1]) || (req.query?.token as string)

  if (!token) {
    return res.status(401).json({
      error: 'Acesso não autorizado. Token JWT não fornecido. Por favor, faça login.'
    })
  }

  try {
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
