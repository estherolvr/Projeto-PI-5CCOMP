import { prisma } from '../db'

export async function supabaseRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL!.replace(/\/$/, '')}/auth/v1/${path}`, {
    ...options,
    headers: { apikey: process.env.SUPABASE_ANON_KEY!, 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) throw new Error('Credenciais inválidas ou sessão expirada.')
  return response.json() as Promise<any>
}

export async function findInstitutionalUser(email: string) {
  const cleanEmail = email.toLowerCase().trim()
  const employee = await prisma.user.findUnique({ where: { email: cleanEmail } })
  if (employee && employee.status === 'ativo' && ['asa', 'admin'].includes(employee.role)) {
    const { password, ...profile } = employee
    return profile
  }
  const student = await prisma.student.findUnique({ where: { email: cleanEmail } })
  if (student) return { ...student, role: 'aluno' }
  throw new Error('Usuário sem acesso institucional cadastrado.')
}
