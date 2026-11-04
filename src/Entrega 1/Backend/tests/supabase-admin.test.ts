import test from 'node:test'
import assert from 'node:assert/strict'

process.env.SUPABASE_URL = 'https://auth.test.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-secret'

const { createInstitutionalUser, removeProvisionedUser, SupabaseProvisioningError } = await import('../src/services/supabase-admin')

test('provisions a confirmed Supabase identity without exposing the service key in the payload', async () => {
  const originalFetch = globalThis.fetch
  let request: { url: string; init?: RequestInit } | undefined
  globalThis.fetch = (async (input, init) => {
    request = { url: String(input), init }
    return new Response(JSON.stringify({ id: 'auth-user-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  try {
    const id = await createInstitutionalUser('student@test.invalid', 'temporary-password', { role: 'aluno' })
    assert.equal(id, 'auth-user-1')
    assert.equal(request?.url, 'https://auth.test.invalid/auth/v1/admin/users')
    const body = JSON.parse(String(request?.init?.body))
    assert.deepEqual(body, { email: 'student@test.invalid', password: 'temporary-password', email_confirm: true, user_metadata: { role: 'aluno' } })
    assert.equal(JSON.stringify(body).includes('test-service-secret'), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('maps duplicate identities and supports compensating deletion', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async (_input, init) => {
    calls++
    if (init?.method === 'DELETE') return new Response(null, { status: 204 })
    return new Response(JSON.stringify({ message: 'A user with this email address has already been registered' }), { status: 422 })
  }) as typeof fetch
  try {
    await assert.rejects(() => createInstitutionalUser('existing@test.invalid', 'temporary-password', {}), (error: unknown) => {
      assert.ok(error instanceof SupabaseProvisioningError)
      assert.equal(error.statusCode, 409)
      return true
    })
    assert.equal(await removeProvisionedUser('auth-user-1'), true)
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})
