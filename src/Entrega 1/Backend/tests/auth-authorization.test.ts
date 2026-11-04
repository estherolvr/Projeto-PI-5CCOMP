import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'

process.env.NODE_ENV = 'test'
process.env.APP_AUTH_PROVIDER = ''
process.env.JWT_SECRET = 'isolated-auth-authorization-test'

const { authenticateToken, requireRole } = await import('../src/middleware/auth')

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
}

function signedToken(role: string) {
  return jwt.sign({ id: `test-${role}`, name: role, email: `${role}@test.invalid`, role }, process.env.JWT_SECRET!)
}

test('authorization requires a strict Bearer header and rejects URL query tokens', async () => {
  for (const req of [
    { headers: {}, query: { token: signedToken('admin') } },
    { headers: { authorization: `Basic ${signedToken('admin')}` }, query: {} },
    { headers: { authorization: `Bearer ${signedToken('admin')} extra` }, query: {} },
  ]) {
    const res = response()
    let continued = false
    await authenticateToken(req as any, res as any, (() => { continued = true }) as any)
    assert.equal(res.statusCode, 401)
    assert.equal(continued, false)
  }
})

test('a valid student identity cannot pass an administrator authorization check', async () => {
  const req: any = { headers: { authorization: `Bearer ${signedToken('aluno')}`, 'x-role': 'admin', 'x-user-id': 'forged-admin' }, query: {} }
  const authRes = response()
  let authenticated = false
  await authenticateToken(req, authRes as any, (() => { authenticated = true }) as any)
  assert.equal(authenticated, true)
  assert.equal(req.user.role, 'aluno')
  assert.equal(req.user.id, 'test-aluno')

  const roleRes = response()
  let authorized = false
  requireRole(['admin'])(req, roleRes as any, (() => { authorized = true }) as any)
  assert.equal(roleRes.statusCode, 403)
  assert.equal(authorized, false)
})

test('role checks accept only the profile explicitly allowed by the route', () => {
  const req: any = { user: { id: 'asa-1', role: 'asa' } }
  const adminRes = response()
  let adminPassed = false
  requireRole(['admin'])(req, adminRes as any, (() => { adminPassed = true }) as any)
  assert.equal(adminRes.statusCode, 403)
  assert.equal(adminPassed, false)

  const asaRes = response()
  let asaPassed = false
  requireRole(['asa'])(req, asaRes as any, (() => { asaPassed = true }) as any)
  assert.equal(asaPassed, true)
})
