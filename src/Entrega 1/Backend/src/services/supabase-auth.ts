import { prisma } from '../db'

export class AuthenticationServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
    this.name = 'AuthenticationServiceError'
  }
}

export class InstitutionalAccessError extends Error {
  constructor() {
    super('Usuário sem acesso institucional cadastrado.')
    this.name = 'InstitutionalAccessError'
  }
}

export async function supabaseRequest(path: string, options: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(`${process.env.SUPABASE_URL!.replace(/\/$/, '')}/auth/v1/${path}`, {
      ...options,
      headers: { apikey: process.env.SUPABASE_ANON_KEY!, 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new AuthenticationServiceError(503, 'Serviço de autenticação temporariamente indisponível.')
  }
  if (!response.ok) {
    if (response.status === 429) throw new AuthenticationServiceError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.')
    if (response.status >= 500) throw new AuthenticationServiceError(503, 'Serviço de autenticação temporariamente indisponível.')
    throw new AuthenticationServiceError(401, 'Credenciais inválidas ou sessão expirada.')
  }
  return response.json() as Promise<any>
}

export async function findInstitutionalUser(email: string) {
  const cleanEmail = email.toLowerCase().trim()
  const employee = await prisma.user.findUnique({ where: { email: cleanEmail } })
  if (employee && employee.status === 'ativo' && ['asa', 'admin'].includes(employee.role)) {
    const { password, ...profile } = employee
    const pending = await prisma.auditEvent.findFirst({ where: { action: 'PRIMEIRO_ACESSO_PENDENTE', resource: 'User', resourceId: employee.id }, select: { id: true } })
    return { ...profile, mustChangePassword: Boolean(pending) }
  }
  const student = await prisma.student.findUnique({ where: { email: cleanEmail } })
  if (student) {
    const pending = await prisma.auditEvent.findFirst({ where: { action: 'PRIMEIRO_ACESSO_PENDENTE', resource: 'Student', resourceId: student.id }, select: { id: true } })
    return { ...student, role: 'aluno', mustChangePassword: Boolean(pending) }
  }
  throw new InstitutionalAccessError()
}
