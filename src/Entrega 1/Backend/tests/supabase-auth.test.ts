import test from 'node:test'
import assert from 'node:assert/strict'

process.env.SUPABASE_URL = 'https://auth.test.invalid'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

const { AuthenticationServiceError, supabaseRequest } = await import('../src/services/supabase-auth')

async function expectAuthError(status: number, expectedStatusCode: number) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('{}', { status })) as typeof fetch
  try {
    await assert.rejects(() => supabaseRequest('user'), (error: unknown) => {
      assert.ok(error instanceof AuthenticationServiceError)
      assert.equal(error.statusCode, expectedStatusCode)
      return true
    })
  } finally {
    globalThis.fetch = originalFetch
  }
}

test('Supabase invalid sessions remain authentication failures', async () => {
  await expectAuthError(401, 401)
})

test('Supabase rate limiting is preserved for the client', async () => {
  await expectAuthError(429, 429)
})

test('Supabase outages are reported as service unavailable', async () => {
  await expectAuthError(502, 503)
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => { throw new TypeError('network unavailable') }) as typeof fetch
  try {
    await assert.rejects(() => supabaseRequest('user'), (error: unknown) => {
      assert.ok(error instanceof AuthenticationServiceError)
      assert.equal(error.statusCode, 503)
      return true
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
