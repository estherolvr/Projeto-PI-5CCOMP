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
import { withRuntimeContext, type StorageBucket } from '../src/services/runtime-context'

test('chat attachments store actual bytes and text with conversation ownership', async t => {
  const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const dir = mkdtempSync(join(tmpdir(), 'alvaro-chat-files-')), path = join(dir, 'db.sqlite')
  process.env.DATABASE_URL = `file:${path}`
  process.env.JWT_SECRET = 'isolated-chat-file-test'
  process.env.NODE_ENV = 'test'; process.env.APP_AUTH_PROVIDER = ''; process.env.GEMINI_API_KEY = ''
  const require = createRequire(import.meta.url), schema = new DatabaseSync(path)
  schema.exec(execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', join(backend, 'prisma/schema.prisma'), '--script'], { cwd: backend, encoding: 'utf8' }))
  schema.close()
  const [{ prisma }, { chatRouter }, { storedChatAttachments, recentAttachmentContexts }] = await Promise.all([import('../src/db'), import('../src/routes/chat.routes'), import('../src/services/chat-attachments')])
  const objects = new Map<string, { buffer: Uint8Array; type: string }>()
  const storage: StorageBucket = {
    async put(key, value, options) { objects.set(key, { buffer: new Uint8Array(value), type: options?.httpMetadata.contentType || '' }) },
    async get(key) { const file = objects.get(key); return file ? { arrayBuffer: async () => new Uint8Array(file.buffer).buffer, httpMetadata: { contentType: file.type } } : null },
    async delete(key) { objects.delete(key) },
  }
  let storageAvailable = true
  const tasks: Promise<unknown>[] = []
  const app = express(); app.use(express.json())
  app.use((_req, _res, next) => withRuntimeContext({ storage: storageAvailable ? storage : undefined, waitUntil: task => tasks.push(task) }, next))
  app.use('/chat', chatRouter)
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r))
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  const tokens = Object.fromEntries([['a', 'aluno'], ['b', 'aluno'], ['staff', 'asa']].map(([id, role]) => [id, jwt.sign({ id, role, name: id, email: `${id}@test.invalid` }, process.env.JWT_SECRET!)]))
  const request = (path: string, who = 'a', body?: FormData) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${tokens[who]}` }, body })
  const form = (name = 'cronograma.txt', content: string | Uint8Array = 'Cronograma de teste: entrega em 13/03/2035 às 17:30.', message = 'Qual a data no arquivo?', mime = 'text/plain') => {
    const data = new FormData(); data.append('content', message); data.append('files', new Blob([content], { type: mime }), name); return data
  }
  let saved: any
  try {
    await prisma.student.createMany({ data: ['a', 'b'].map(id => ({ id, name: id, ra: id, email: `${id}@test.invalid`, course: 'Teste', semester: 1, period: 'noite' })) })
    await prisma.conversation.createMany({ data: [{ id: 'a-chat', studentId: 'a', title: 'A' }, { id: 'b-chat', studentId: 'b', title: 'B' }] })
    await t.test('upload is forbidden to another student and staff before any object is stored', async () => {
      assert.equal((await request('/chat/conversations/a-chat/messages', 'b', form())).status, 403)
      assert.equal((await request('/chat/conversations/a-chat/messages', 'staff', form())).status, 403)
      assert.equal(objects.size, 0); assert.equal(await prisma.chatMessage.count(), 0)
    })
    await t.test('arbitrary binary formats are accepted and retained without claiming AI text extraction', async () => {
      const binary = new Uint8Array([0, 255, 1, 2, 128, 13, 10])
      const uploaded = await request('/chat/conversations/b-chat/messages', 'b', form('apresentacao.pptx', binary, 'O que há neste arquivo?', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'))
      assert.equal(uploaded.status, 201)
      const result = await uploaded.json() as any
      const attachment = result.userMessage.attachments[0]
      assert.equal(attachment.name, 'apresentacao.pptx')
      assert.equal(attachment.readable, false)
      assert.equal(attachment.storageKey, undefined)
      const message = await prisma.chatMessage.findUniqueOrThrow({ where: { id: result.userMessage.id } })
      const contexts = await withRuntimeContext({ storage, waitUntil: task => tasks.push(task) }, () => recentAttachmentContexts([message], []))
      assert.match(contexts[0].content, /não pôde ser interpretado/)
      const url = `/chat/conversations/b-chat/messages/${result.userMessage.id}/attachments/${attachment.id}/download`
      const downloaded = await request(url, 'b')
      assert.equal(downloaded.status, 200)
      assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), binary)
      assert.equal((await prisma.chatMessage.count({ where: { conversationId: 'a-chat' } })), 0)
    })
    await t.test('missing storage reports failure instead of a successful-looking attachment', async () => {
      const existingObjects = objects.size
      storageAvailable = false
      try { assert.equal((await request('/chat/conversations/a-chat/messages', 'a', form())).status, 503) }
      finally { storageAvailable = true }
      assert.equal(objects.size, existingObjects)
      assert.equal(await prisma.chatMessage.count({ where: { conversationId: 'a-chat' } }), 0)
    })
    await t.test('upload persists metadata and readable text, with an explicit unavailable-provider fallback', async () => {
      const r = await request('/chat/conversations/a-chat/messages', 'a', form()); assert.equal(r.status, 201)
      saved = await r.json()
      assert.equal(saved.userMessage.attachments[0].name, 'cronograma.txt')
      assert.equal(saved.userMessage.attachments[0].storageKey, undefined)
      assert.equal(saved.userMessage.attachments[0].textKey, undefined)
      assert.match(saved.aiMessage.content, /IA generativa indisponível/)
      const stored = await prisma.chatMessage.findUniqueOrThrow({ where: { id: saved.userMessage.id } })
      assert.equal(storedChatAttachments(stored.actions).length, 1)
      const contexts = await withRuntimeContext({ storage, waitUntil: task => tasks.push(task) }, () => recentAttachmentContexts([stored], []))
      assert.equal(contexts[0].content, 'Cronograma de teste: entrega em 13/03/2035 às 17:30.')
    })
    await t.test('reload and authenticated download preserve exact bytes; IDs cannot cross conversations', async () => {
      const r = await request('/chat/conversations/a-chat'); assert.equal(r.status, 200)
      const conversation = await r.json() as any
      assert.deepEqual(conversation.messages.map((m: any) => m.role), ['user', 'assistant'])
      assert.deepEqual(conversation.messages.find((m: any) => m.id === saved.userMessage.id).attachments, saved.userMessage.attachments)
      const path = `/chat/conversations/a-chat/messages/${saved.userMessage.id}/attachments/${saved.userMessage.attachments[0].id}/download`
      const downloaded = await request(path); assert.equal(downloaded.status, 200)
      assert.equal(await downloaded.text(), 'Cronograma de teste: entrega em 13/03/2035 às 17:30.')
      assert.match(downloaded.headers.get('content-disposition') || '', /attachment/)
      assert.equal((await request(path, 'b')).status, 403)
      assert.equal((await request(path, 'staff')).status, 200)
      assert.equal((await request(path.replace('a-chat', 'b-chat'), 'b')).status, 404)
      assert.equal((await fetch(base + path)).status, 401)
    })
    await t.test('failed message persistence rolls back new storage objects', async () => {
      const before = [...objects.keys()].filter(key => key.startsWith('chat-attachments/')).sort()
      const failureDb = new DatabaseSync(path)
      failureDb.exec("CREATE TRIGGER reject_chat BEFORE INSERT ON ChatMessage WHEN NEW.content = 'fail-persistence' BEGIN SELECT RAISE(ABORT, 'intentional test failure'); END;")
      try { assert.equal((await request('/chat/conversations/a-chat/messages', 'a', form('rollback.txt', 'Rollback fixture', 'fail-persistence'))).status, 500) }
      finally { failureDb.exec('DROP TRIGGER reject_chat'); failureDb.close() }
      assert.deepEqual([...objects.keys()].filter(key => key.startsWith('chat-attachments/')).sort(), before)
      assert.equal(await prisma.chatMessage.count({ where: { conversationId: 'a-chat' } }), 2)
    })
  } finally {
    await Promise.allSettled(tasks); await prisma.$disconnect()
    await new Promise<void>(r => server.close(() => r())); rmSync(dir, { recursive: true, force: true })
  }
})
