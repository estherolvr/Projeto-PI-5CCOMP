import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, rmdirSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import express from 'express'
import jwt from 'jsonwebtoken'

test('admin API consumes persisted student and ASA activity with scoped access', async t => {
  const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const workRoot = resolve(backend, 'work')
  mkdirSync(workRoot, { recursive: true })
  const fixtureDir = mkdtempSync(join(workRoot, 'admin-integration-'))
  const databasePath = join(fixtureDir, 'integration.db')
  process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`
  process.env.JWT_SECRET = 'isolated-test-secret-not-used-in-production'
  const require = createRequire(import.meta.url)
  const ddl = execFileSync(process.execPath, [
    require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty',
    '--to-schema-datamodel', join(backend, 'prisma/schema.prisma'), '--script',
  ], { cwd: backend, encoding: 'utf8' })
  const sqlite = new DatabaseSync(databasePath)
  sqlite.exec(ddl)
  sqlite.close()

  const [{ prisma }, { adminRouter }, { metricsRouter }, { studentRouter }, { ticketRouter }, { aiService }] = await Promise.all([
    import('../src/db'), import('../src/routes/admin.routes'), import('../src/routes/metrics.routes'),
    import('../src/routes/student.routes'), import('../src/routes/ticket.routes'), import('../src/services/ai.service'),
  ])
  const aiMock = t.mock.method(aiService, 'analyzeTicket', async () => ({
    suggestedPriority: 'media', intent: 'documentos', summary: 'Análise local do teste', confidence: 0.8,
    recommendation: 'Verificar solicitação', sentiment: 'neutro',
  }))
  const app = express()
  app.use(express.json())
  app.use('/admin', adminRouter)
  app.use('/metrics', metricsRouter)
  app.use('/students', studentRouter)
  app.use('/tickets', ticketRouter)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const baseUrl = `http://127.0.0.1:${address.port}`
  const token = (id: string, role: string) => jwt.sign({ id, role, name: `Teste ${role}`, email: `${id}@integration.invalid` }, process.env.JWT_SECRET!)
  const tokens = { admin: token('admin-1', 'admin'), asa: token('asa-1', 'asa'), aluno: token('student-1', 'aluno'), outro: token('student-2', 'aluno') }
  async function request(path: string, role: keyof typeof tokens = 'admin', method = 'GET', body?: unknown) {
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers: { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, data: await response.json() as any }
  }
  try {
    await t.test('empty metrics have real zeros and unavailable measurements', async () => {
      const result = await request('/metrics/overview?days=7')
      assert.equal(result.status, 200)
      assert.equal(result.data.summary.totalTickets, 0)
      assert.equal(result.data.summary.csat, null)
      assert.equal(result.data.summary.avgResponseMinutes, null)
      assert.equal(result.data.summary.slaAdherence, null)
      assert.equal(result.data.chartData.length, 7)
      assert.equal((await request('/metrics/overview?days=3')).status, 400)
    })

    await prisma.user.createMany({ data: [
      { id: 'admin-1', name: 'Administrador Teste', email: 'admin-1@integration.invalid', password: 'private-secret', role: 'admin' },
      { id: 'asa-1', name: 'Atendente Teste', email: 'asa-1@integration.invalid', password: 'private-secret', role: 'asa' },
      { id: 'asa-2', name: 'Atendente Inativo', email: 'asa-2@integration.invalid', password: 'private-secret', role: 'asa', status: 'inativo' },
    ] })
    await prisma.student.createMany({ data: [
      { id: 'student-1', name: 'Aluna Integração', ra: '900001', email: 'student-1@integration.invalid', course: 'Administração', semester: 3, period: 'noite' },
      { id: 'student-2', name: 'Aluno Outro', ra: '900002', email: 'student-2@integration.invalid', course: 'Economia', semester: 1, period: 'manha', status: 'irregular' },
    ] })
    await t.test('student cannot enumerate admin, metrics, staff or other student records', async () => {
      for (const path of ['/admin/students', '/admin/users', '/admin/dashboard-stats', '/admin/prompts', '/admin/health', '/metrics/overview', '/metrics/queue', '/students', '/students/student-2']) {
        assert.equal((await request(path, 'aluno')).status, 403, path)
      }
      assert.equal((await request('/students/student-1', 'aluno')).status, 200)
      assert.equal((await request('/admin/audit-logs', 'asa')).status, 200)
      assert.equal((await request('/admin/users/asa-1/status', 'asa', 'PATCH', { status: 'inativo' })).status, 403)
      assert.equal((await request('/admin/students/student-1/status', 'asa', 'PATCH', { status: 'trancado' })).status, 403)
    })

    await t.test('student filters and pagination preserve unfiltered summary/course choices', async () => {
      const result = await request('/admin/students?course=Economia&limit=1&page=1')
      assert.equal(result.status, 200)
      assert.equal(result.data.total, 1)
      assert.equal(result.data.students[0].id, 'student-2')
      assert.deepEqual(result.data.summary, { total: 2, regular: 1, irregular: 1, trancado: 0 })
      assert.deepEqual(result.data.courses, ['Administração', 'Economia'])
      const created = await request('/admin/students', 'admin', 'POST', { name: 'Nova Aluna', ra: '900003', email: 'NOVA@integration.invalid', course: 'Economia', semester: 2, period: 'tarde' })
      assert.equal(created.status, 201)
      assert.equal(created.data.email, 'nova@integration.invalid')
      assert.equal((await request(`/admin/students/${created.data.id}/status`, 'admin', 'PATCH', { status: 'trancado' })).status, 200)
      assert.equal((await request('/admin/students?status=trancado')).data.total, 1)
      assert.equal((await request('/admin/students', 'admin', 'POST', { name: 'Duplicada', ra: '900003', email: 'duplicate@integration.invalid', course: 'Economia' })).status, 409)
    })

    let ticketId = ''
    await t.test('student creation, ASA response and resolution feed admin metrics', async () => {
      await prisma.sLARule.create({ data: { name: 'Documentos reais', priority: 'media', category: 'documentos', firstResponseMinutes: 15, resolutionHours: 6 } })
      const created = await request('/tickets', 'aluno', 'POST', { title: 'Solicitação de histórico', description: 'Preciso do histórico acadêmico', category: 'documentos', studentId: 'student-2' })
      assert.equal(created.status, 201)
      ticketId = created.data.id
      assert.equal(created.data.studentId, 'student-1')
      assert.ok(Math.abs((+new Date(created.data.slaDeadline) - +new Date(created.data.createdAt)) / 3600000 - 6) < 0.01)
      assert.equal(aiMock.mock.callCount(), 1)
      assert.equal((await request(`/tickets/${ticketId}`, 'outro')).status, 403)
      assert.equal((await request(`/tickets/${ticketId}/messages`, 'outro', 'POST', { content: 'Não deve gravar' })).status, 403)
      assert.equal((await request(`/tickets/${ticketId}`, 'aluno', 'PATCH', { status: 'resolvido' })).status, 403)
      assert.equal((await request(`/tickets/${ticketId}`, 'asa', 'PATCH', { assignedTo: 'asa-1', status: 'aguardando_aluno' })).status, 200)
      const dashboard = await request('/admin/dashboard-stats')
      assert.equal(dashboard.data.totalAsa, 2)
      assert.equal(dashboard.data.activeAsa, 1)
      assert.equal(dashboard.data.openTickets, 1)
      assert.equal(dashboard.data.teamStatus.find((u: any) => u.id === 'asa-1').tickets, 1)
      await request(`/tickets/${ticketId}/messages`, 'asa', 'POST', { content: 'Nota interna', isInternal: true })
      await request(`/tickets/${ticketId}/messages`, 'asa', 'POST', { content: 'Seu histórico será disponibilizado.', isInternal: false })
      const visible = await request(`/tickets/${ticketId}`, 'aluno')
      assert.ok(visible.data.messages.every((m: any) => !m.isInternal))
      assert.equal((await request(`/tickets/${ticketId}`, 'asa', 'PATCH', { status: 'resolvido' })).status, 200)
      await prisma.aIFeedback.create({ data: { studentId: 'student-1', type: 'positive', snippet: 'Resposta útil', rating: 4 } })
      const metrics = await request('/metrics/overview?days=1')
      assert.equal(metrics.data.summary.totalTickets, 1)
      assert.equal(metrics.data.summary.resolvedTickets, 1)
      assert.equal(metrics.data.summary.resolutionRate, 100)
      assert.equal(metrics.data.summary.csat, 4)
      assert.equal(metrics.data.sampleCounts.responseTimes, 1)
      assert.equal(metrics.data.sampleCounts.resolutionTimes, 1)
      assert.equal(metrics.data.chartData.reduce((sum: number, row: any) => sum + row.resolvidos, 0), 1)
      assert.equal(metrics.data.summary.slaAdherence, 100)
      assert.ok(!JSON.stringify(metrics.data).includes('private-secret'))
    })

    await t.test('dashboard counts more than 1000 persisted tickets; history without resolution audit is not fabricated', async () => {
      const old = new Date(Date.now() - 120 * 86400000)
      await prisma.ticket.createMany({ data: Array.from({ length: 1001 }, (_, i) => ({
        number: 2000 + i, title: `Histórico ${i}`, description: 'Registro de teste', studentId: 'student-2',
        status: 'fechado', category: 'academico', priority: 'baixa', createdAt: old, slaDeadline: old,
      })) })
      await prisma.ticket.create({ data: {
        number: 4000, title: 'SLA vencido real', description: 'Prazo ultrapassado', studentId: 'student-1', assignedTo: 'asa-1',
        status: 'aguardando_aluno', category: 'financeiro', priority: 'alta', slaStatus: 'ok', slaDeadline: new Date(Date.now() - 60000),
      } })
      const dashboard = await request('/admin/dashboard-stats')
      assert.equal(dashboard.data.totalTickets, 1003)
      assert.equal(dashboard.data.pieData.reduce((sum: number, row: any) => sum + row.value, 0), 1003)
      assert.equal(dashboard.data.slaRiskTickets, 1)
      assert.equal(dashboard.data.chartData.reduce((sum: number, row: any) => sum + row.resolvidos, 0), 1)
      const queue = await request('/metrics/queue', 'asa')
      assert.equal(queue.data.length, 1)
      assert.equal(queue.data[0].slaStatus, 'breached')
      assert.equal(queue.data[0].isSlaBreached, true)
      const metrics = await request('/metrics/overview?days=30')
      assert.equal(metrics.data.summary.totalTickets, 2)
      assert.equal(metrics.data.summary.activeSlaBreachedTickets, 1)
    })

    await t.test('staff writes return public fields and real service checks distinguish configuration', async () => {
      const created = await request('/admin/users', 'admin', 'POST', { name: 'Novo ASA', email: 'novo@integration.invalid', password: 'not-public', role: 'asa' })
      assert.equal(created.status, 201)
      assert.equal(created.data.password, undefined)
      const updated = await request(`/admin/users/${created.data.id}/status`, 'admin', 'PATCH', { status: 'inativo' })
      assert.equal(updated.status, 200)
      assert.equal(updated.data.password, undefined)
      assert.equal((await request('/admin/users', 'admin', 'POST', { name: 'Inválido', email: 'invalid@integration.invalid', role: 'unknown' })).status, 400)
      const list = await request('/admin/users')
      assert.ok(list.data.every((user: any) => user.password === undefined))
      assert.equal(list.data.find((user: any) => user.id === 'asa-1')._count.assignedTickets, 1, 'workload excludes resolved tickets')
      const health = await request('/admin/health')
      assert.equal(health.data.checks.find((check: any) => check.id === 'database').status, 'operacional')
      assert.ok(health.data.checks.filter((check: any) => ['gemini', 'r2'].includes(check.id)).every((check: any) => check.status !== 'operacional'))
    })
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await prisma.$disconnect()
    if (process.env.KEEP_ADMIN_TEST_DB === '1') {
      console.log(`Isolated browser fixture: ${databasePath}`)
    } else {
      // Only the exact files created for this test are removed; no recursive deletion.
      for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(`${databasePath}${suffix}`, { force: true })
      rmdirSync(fixtureDir)
    }
  }
})
