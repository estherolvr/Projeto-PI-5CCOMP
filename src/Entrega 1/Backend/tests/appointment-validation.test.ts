import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import express from 'express'
import jwt from 'jsonwebtoken'

test('appointment creation requires a registered student and a valid weekday slot', async () => {
  const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const directory = mkdtempSync(join(tmpdir(), 'alvaro-appointment-validation-'))
  const databasePath = join(directory, 'test.db')
  process.env.DATABASE_URL = `file:${databasePath}`
  process.env.JWT_SECRET = 'isolated-appointment-validation'
  process.env.NODE_ENV = 'test'
  process.env.APP_AUTH_PROVIDER = ''
  const require = createRequire(import.meta.url)
  const database = new DatabaseSync(databasePath)
  database.exec(execFileSync(process.execPath, [
    require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty',
    '--to-schema-datamodel', join(backend, 'prisma/schema.prisma'), '--script',
  ], { cwd: backend, encoding: 'utf8' }))
  database.close()

  const [{ prisma }, { appointmentRouter }] = await Promise.all([
    import('../src/db'), import('../src/routes/appointment.routes'),
  ])
  const app = express()
  app.use(express.json())
  app.use('/appointments', appointmentRouter)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const baseUrl = `http://127.0.0.1:${address.port}`
  const token = (id: string, role: string) => jwt.sign({ id, role, name: 'Teste', email: 'teste@example.invalid' }, process.env.JWT_SECRET!)
  async function request(role: 'aluno' | 'asa', body: unknown, id = role === 'aluno' ? 'student-1' : 'staff-1') {
    const response = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token(id, role)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, data: await response.json() as any }
  }

  try {
    await prisma.student.create({ data: {
      id: 'student-1', name: 'Aluna de Teste', ra: '900001', email: 'aluna@example.invalid',
      course: 'Ciência da Computação', semester: 3, period: 'noite',
    } })
    await prisma.user.create({ data: {
      id: 'staff-1', name: 'Atendente de Teste', email: 'asa@example.invalid', role: 'asa',
    } })

    const valid = { subject: 'Orientação acadêmica', date: '2026-11-04', time: '14:15' }
    const byRa = await request('asa', { ...valid, studentRa: '900001' })
    assert.equal(byRa.status, 201)
    assert.equal(byRa.data.studentId, 'student-1')

    assert.equal((await request('asa', { ...valid, studentRa: '999999' })).status, 400)
    assert.equal((await request('asa', valid)).status, 400)
    assert.equal((await request('aluno', { ...valid, date: '2020-01-04' })).status, 400)
    assert.equal((await request('aluno', { ...valid, date: '2026-11-07' })).status, 400)
    assert.equal((await request('aluno', { ...valid, time: '03:17' })).status, 400)
    assert.equal((await request('aluno', { ...valid, date: '2026-02-30' })).status, 400)

    const rows = await prisma.appointment.findMany({ select: { studentId: true } })
    assert.deepEqual(rows, [{ studentId: 'student-1' }])
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await prisma.$disconnect()
    rmSync(directory, { recursive: true, force: true })
  }
})
