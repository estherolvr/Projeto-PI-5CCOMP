export class SupabaseProvisioningError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
    this.name = 'SupabaseProvisioningError'
  }
}

function adminHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) throw new SupabaseProvisioningError(503, 'Provisionamento de login não configurado.')
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

function authUrl(path: string) {
  const base = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
  if (!base) throw new SupabaseProvisioningError(503, 'Serviço de autenticação não configurado.')
  return `${base}/auth/v1/${path}`
}

async function providerError(response: Response) {
  const body = await response.json().catch(() => null) as { message?: unknown; msg?: unknown; error_description?: unknown } | null
  const message = [body?.message, body?.msg, body?.error_description].find(value => typeof value === 'string') as string | undefined
  if (response.status === 422 || response.status === 409 || /already|registered|exists/i.test(message || '')) {
    return new SupabaseProvisioningError(409, 'Já existe um login de autenticação para este e-mail.')
  }
  if (response.status === 429) return new SupabaseProvisioningError(429, 'Limite de convites atingido. Tente novamente mais tarde.')
  return new SupabaseProvisioningError(502, 'O Supabase não conseguiu provisionar o login.')
}

export async function inviteInstitutionalUser(email: string, metadata: Record<string, string>) {
  let response: Response
  try {
    response = await fetch(authUrl('invite'), {
      method: 'POST', headers: adminHeaders(),
      body: JSON.stringify({
        email,
        data: metadata,
        ...(process.env.AUTH_REDIRECT_URL ? { redirect_to: process.env.AUTH_REDIRECT_URL } : {}),
      }),
    })
  } catch (error) {
    if (error instanceof SupabaseProvisioningError) throw error
    throw new SupabaseProvisioningError(503, 'Serviço de autenticação temporariamente indisponível.')
  }
  if (!response.ok) throw await providerError(response)
  const user = await response.json() as { id?: unknown }
  if (typeof user.id !== 'string' || !user.id) throw new SupabaseProvisioningError(502, 'O Supabase retornou um usuário inválido.')
  return user.id
}

export async function createInstitutionalUser(email: string, password: string, metadata: Record<string, string>) {
  let response: Response
  try {
    response = await fetch(authUrl('admin/users'), {
      method: 'POST', headers: adminHeaders(),
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
    })
  } catch (error) {
    if (error instanceof SupabaseProvisioningError) throw error
    throw new SupabaseProvisioningError(503, 'Serviço de autenticação temporariamente indisponível.')
  }
  if (!response.ok) throw await providerError(response)
  const user = await response.json() as { id?: unknown }
  if (typeof user.id !== 'string' || !user.id) throw new SupabaseProvisioningError(502, 'O Supabase retornou um usuário inválido.')
  return user.id
}

export async function removeProvisionedUser(userId: string) {
  try {
    const response = await fetch(authUrl(`admin/users/${encodeURIComponent(userId)}`), {
      method: 'DELETE', headers: adminHeaders(),
    })
    return response.ok || response.status === 404
  } catch {
    return false
  }
}

export function requiresSupabaseProvisioning() {
  return process.env.NODE_ENV === 'production' || process.env.APP_AUTH_PROVIDER === 'supabase'
}
