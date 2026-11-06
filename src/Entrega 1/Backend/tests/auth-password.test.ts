import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'

process.env.NODE_ENV = 'test'
process.env.APP_AUTH_PROVIDER = ''
process.env.JWT_SECRET = 'password-flow-test-secret'
process.env.SUPABASE_URL = 'https://auth.test.invalid'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.AUTH_REDIRECT_URL = 'https://app.test.invalid/'

const { authRouter } = await import('../src/routes/auth.routes')

test('password recovery and authenticated password change use Supabase safely', async () => {
  const originalFetch = globalThis.fetch
  const providerRequests: Array<{ url: string; body: any; authorization?: string }> = []
  globalThis.fetch = (async (input, init) => {
    if (!String(input).startsWith('https://auth.test.invalid/')) return originalFetch(input, init)
    providerRequests.push({
      url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null,
      authorization: new Headers(init?.headers).get('authorization') || undefined,
    })
    return new Response(JSON.stringify({ id: 'user-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  const app = express(); app.use(express.json()); app.use('/auth', authRouter)
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  try {
    let response = await fetch(`${base}/auth/recover-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'USER@TEST.INVALID' }) })
    assert.equal(response.status, 200)
    assert.deepEqual(providerRequests[0].body, { email: 'user@test.invalid', redirect_to: 'https://app.test.invalid/reset-password' })

    process.env.NODE_ENV = 'production'
    process.env.AUTH_REDIRECT_URL = 'http://localhost:3000/auth/reset-password'
    response = await fetch(`${base}/auth/recover-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@test.invalid' }) })
    assert.equal(response.status, 200)
    assert.equal(providerRequests[1].body.redirect_to, 'https://alvaro-ai.joao-fsantana.workers.dev/reset-password')
    process.env.NODE_ENV = 'test'
    process.env.AUTH_REDIRECT_URL = 'https://app.test.invalid/'

    response = await fetch(`${base}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: 'recovery-token', password: 'new-password' }) })
    assert.equal(response.status, 200)
    assert.equal(providerRequests[2].authorization, 'Bearer recovery-token')

    const token = jwt.sign({ id: 'user-1', name: 'Test', email: 'user@test.invalid', role: 'aluno' }, process.env.JWT_SECRET!)
    response = await fetch(`${base}/auth/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ password: 'another-password' }) })
    assert.equal(response.status, 200)
    assert.equal(providerRequests[3].authorization, `Bearer ${token}`)
  } finally {
    globalThis.fetch = originalFetch
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})
