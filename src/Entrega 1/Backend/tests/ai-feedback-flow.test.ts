import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import express from 'express'
import jwt from 'jsonwebtoken'

test('AI feedback is tied to owned assistant responses and powers the real admin dashboard', async () => {
  const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const fixture = mkdtempSync(join(tmpdir(), 'ialvaro-feedback-'))
  const databasePath = join(fixture, 'feedback.db')
  process.env.DATABASE_URL = `file:${databasePath}`
  process.env.JWT_SECRET = 'feedback-flow-secret'
  process.env.NODE_ENV = 'test'
  process.env.APP_AUTH_PROVIDER = ''

  const require = createRequire(import.meta.url)
  const database = new DatabaseSync(databasePath)
  database.exec(execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', join(backend, 'prisma/schema.prisma'), '--script'], { cwd: backend, encoding: 'utf8' }))
  database.close()

  const [{ prisma }, { chatRouter }, { adminRouter }] = await Promise.all([
    import('../src/db'), import('../src/routes/chat.routes'), import('../src/routes/admin.routes'),
  ])
  await prisma.student.createMany({ data: [
    { id: 'student-a', name: 'Ana Aluna', ra: '20260001', email: 'ana@test.invalid', course: 'Administração', semester: 2, period: 'noite' },
    { id: 'student-b', name: 'Bruno Aluno', ra: '20260002', email: 'bruno@test.invalid', course: 'Economia', semester: 3, period: 'manha' },
  ] })
  await prisma.user.createMany({ data: [
    { id: 'admin', name: 'Admin', email: 'admin@test.invalid', role: 'admin' },
    { id: 'asa', name: 'ASA', email: 'asa@test.invalid', role: 'asa' },
  ] })
  await prisma.conversation.createMany({ data: [
    { id: 'conversation-a', studentId: 'student-a', title: 'Conversa da Ana' },
    { id: 'conversation-b', studentId: 'student-b', title: 'Conversa do Bruno' },
  ] })
  await prisma.chatMessage.createMany({ data: [
    { id: 'answer-positive', conversationId: 'conversation-a', role: 'assistant', content: 'Resposta oficial positiva da IA.' },
    { id: 'answer-negative', conversationId: 'conversation-a', role: 'assistant', content: 'Resposta oficial negativa da IA.' },
    { id: 'question-a', conversationId: 'conversation-a', role: 'user', content: 'Pergunta da Ana.' },
    { id: 'answer-b', conversationId: 'conversation-b', role: 'assistant', content: 'Resposta privada do Bruno.' },
  ] })

  const tokens = {
    student: jwt.sign({ id: 'student-a', name: 'Ana Aluna', email: 'ana@test.invalid', role: 'aluno' }, process.env.JWT_SECRET),
    other: jwt.sign({ id: 'student-b', name: 'Bruno Aluno', email: 'bruno@test.invalid', role: 'aluno' }, process.env.JWT_SECRET),
    admin: jwt.sign({ id: 'admin', name: 'Admin', email: 'admin@test.invalid', role: 'admin' }, process.env.JWT_SECRET),
    asa: jwt.sign({ id: 'asa', name: 'ASA', email: 'asa@test.invalid', role: 'asa' }, process.env.JWT_SECRET),
  }
  const app = express(); app.use(express.json()); app.use('/chat', chatRouter); app.use('/admin', adminRouter)
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(done => server.once('listening', done))
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  async function request(path: string, who: keyof typeof tokens, method = 'GET', body?: unknown) {
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${tokens[who]}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: response.status, data: await response.json() as any }
  }

  try {
    const positive = await request('/chat/feedback', 'student', 'POST', { conversationId: 'conversation-a', messageId: 'answer-positive', type: 'positive', snippet: 'trecho adulterado' })
    assert.equal(positive.status, 201)
    assert.equal(positive.data.snippet, 'Resposta oficial positiva da IA.')
    assert.equal(positive.data.comment, null)

    const negative = await request('/chat/feedback', 'student', 'POST', { conversationId: 'conversation-a', messageId: 'answer-negative', type: 'negative', comment: 'Faltaram os prazos.' })
    assert.equal(negative.status, 201)
    assert.equal(negative.data.rating, 1)

    const comment = await request('/chat/feedback', 'student', 'POST', { conversationId: 'conversation-a', messageId: 'answer-positive', type: 'positive', comment: 'A explicação foi objetiva.' })
    assert.equal(comment.status, 200)
    assert.equal(await prisma.aIFeedback.count(), 2)

    assert.equal((await request('/chat/feedback', 'student', 'POST', { conversationId: 'conversation-b', messageId: 'answer-b', type: 'negative' })).status, 403)
    assert.equal((await request('/chat/feedback', 'student', 'POST', { conversationId: 'conversation-a', messageId: 'question-a', type: 'positive' })).status, 404)
    assert.equal((await request('/chat/feedback', 'asa', 'POST', { conversationId: 'conversation-a', messageId: 'answer-positive', type: 'positive' })).status, 403)

    const conversation = await request('/chat/conversations/conversation-a', 'student')
    assert.equal(conversation.status, 200)
    assert.equal(conversation.data.messages.find((message: any) => message.id === 'answer-positive').feedback.comment, 'A explicação foi objetiva.')
    assert.equal(conversation.data.messages.find((message: any) => message.id === 'answer-negative').feedback.type, 'negative')

    assert.equal((await request('/admin/feedback', 'student')).status, 403)
    assert.equal((await request('/admin/feedback', 'asa')).status, 403)
    const dashboard = await request('/admin/feedback', 'admin')
    assert.equal(dashboard.status, 200)
    assert.deepEqual({ total: dashboard.data.totalCount, positive: dashboard.data.positiveCount, negative: dashboard.data.negativeCount, satisfaction: dashboard.data.positiveRate }, { total: 2, positive: 1, negative: 1, satisfaction: 50 })
    assert.equal(dashboard.data.feedbacks[0].student.ra, '20260001')
    assert.ok(dashboard.data.feedbacks.some((feedback: any) => feedback.snippet === 'Resposta oficial positiva da IA.'))

    const refreshed = await request('/admin/feedback', 'admin')
    assert.equal(refreshed.data.totalCount, 2)
    assert.equal(await prisma.aIFeedback.count({ where: { studentId: 'student-a' } }), 2)
  } finally {
    await prisma.$disconnect()
    await new Promise<void>(done => server.close(() => done()))
    rmSync(fixture, { recursive: true, force: true })
  }
})
