import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import express from 'express'
import jwt from 'jsonwebtoken'

test('first access blocks every role until the provisional password is replaced', async () => {
  const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const workRoot = resolve(backend, 'work')
  mkdirSync(workRoot, { recursive: true })
  const fixtureDir = mkdtempSync(join(workRoot, 'first-access-'))
  const databasePath = join(fixtureDir, 'first-access.db')
  process.env.NODE_ENV = 'test'
  process.env.APP_AUTH_PROVIDER = ''
  process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`
  process.env.JWT_SECRET = 'first-access-flow-secret'
  process.env.SUPABASE_URL = 'https://auth.first-access.invalid'
  process.env.SUPABASE_ANON_KEY = 'first-access-anon-key'

  const require = createRequire(import.meta.url)
  const ddl = execFileSync(process.execPath, [
    require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty',
    '--to-schema-datamodel', join(backend, 'prisma/schema.prisma'), '--script',
  ], { cwd: backend, encoding: 'utf8' })
  const sqlite = new DatabaseSync(databasePath); sqlite.exec(ddl); sqlite.close()

  const [{ prisma }, { authRouter }, { authenticateToken }] = await Promise.all([
    import('../src/db'), import('../src/routes/auth.routes'), import('../src/middleware/auth'),
  ])
  await prisma.user.createMany({ data: [
    { id: 'admin-first', name: 'Admin Primeiro Acesso', email: 'admin-first@test.invalid', role: 'admin', mustChangePassword: true },
    { id: 'asa-first', name: 'ASA Primeiro Acesso', email: 'asa-first@test.invalid', role: 'asa', mustChangePassword: true },
  ] })
  await prisma.student.create({ data: {
    id: 'student-first', name: 'Aluno Primeiro Acesso', email: 'student-first@test.invalid', ra: 'FIRST001',
    course: 'Administração', semester: 1, period: 'noite', mustChangePassword: true,
  } })

  const providerRequests: Array<{ authorization: string | null; password: string }> = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input, init) => {
    if (!String(input).startsWith('https://auth.first-access.invalid/')) return originalFetch(input, init)
    const body = JSON.parse(String(init?.body || '{}'))
    providerRequests.push({ authorization: new Headers(init?.headers).get('authorization'), password: body.password })
    return new Response(JSON.stringify({ id: 'auth-user' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch

  const app = express(); app.use(express.json()); app.use('/auth', authRouter)
  app.get('/private', authenticateToken, (req, res) => res.json({ role: req.user?.role }))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`

  try {
    for (const identity of [
      { id: 'admin-first', email: 'admin-first@test.invalid', role: 'admin' },
      { id: 'asa-first', email: 'asa-first@test.invalid', role: 'asa' },
      { id: 'student-first', email: 'student-first@test.invalid', role: 'aluno' },
    ] as const) {
      const token = jwt.sign({ ...identity, name: identity.id, mustChangePassword: true }, process.env.JWT_SECRET!)
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      let response = await fetch(`${base}/private`, { headers })
      assert.equal(response.status, 403, `${identity.role} must be blocked before changing the password`)
      assert.equal((await response.json() as any).code, 'PASSWORD_CHANGE_REQUIRED')

      response = await fetch(`${base}/auth/me`, { headers })
      assert.equal(response.status, 200)
      assert.equal((await response.json() as any).user.mustChangePassword, true)

      response = await fetch(`${base}/auth/complete-first-access`, {
        method: 'POST', headers, body: JSON.stringify({ password: 'short' }),
      })
      assert.equal(response.status, 400)

      response = await fetch(`${base}/auth/complete-first-access`, {
        method: 'POST', headers, body: JSON.stringify({ password: `personal-${identity.role}-password` }),
      })
      assert.equal(response.status, 200)
      const completed = await response.json() as any
      assert.equal(completed.user.role, identity.role)
      assert.equal(completed.user.mustChangePassword, false)

      response = await fetch(`${base}/private`, { headers })
      assert.equal(response.status, 200, `${identity.role} must access protected routes after completion`)
      assert.equal((await response.json() as any).role, identity.role)

      response = await fetch(`${base}/auth/complete-first-access`, {
        method: 'POST', headers, body: JSON.stringify({ password: 'another-valid-password' }),
      })
      assert.equal(response.status, 409, 'mandatory completion can only occur once')
    }
    assert.equal(providerRequests.length, 3)
    assert.ok(providerRequests.every(request => request.authorization?.startsWith('Bearer ')))
    assert.equal(await prisma.auditEvent.count({ where: { action: 'CONCLUIU_PRIMEIRO_ACESSO' } }), 3)
  } finally {
    globalThis.fetch = originalFetch
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await prisma.$disconnect()
    rmSync(fixtureDir, { recursive: true, force: true })
  }
})
