import { test, expect, api, allowWrites, downloadMatches, evidence } from './fixtures'

test('ADJ-002 @write Aluno anexa texto, recebe resposta fundamentada e baixa após recarregar', async ({ session }, info) => {
  allowWrites()
  const page = await session('student')
  await page.goto('/aluno/chat')
  const createdPromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/chat/conversations' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Nova conversa', exact: true }).click()
  const created = await createdPromise
  expect(created.status()).toBe(201)
  const conversation = await created.json()
  const marker = `ANEXO-QA-${Date.now()}`
  const filename = `${marker.toLowerCase()}.txt`
  const bytes = Buffer.from(`Documento exclusivo de teste automatizado. O código de validação deste anexo é ${marker}. Este documento não contém dados pessoais.`)
  await page.getByLabel('Arquivos do chat', { exact: true }).setInputFiles({ name: filename, mimeType: 'text/plain', buffer: bytes })
  await page.locator('textarea').fill('Qual é o código de validação informado no arquivo anexado? Copie o código exatamente.')
  const sentPromise = page.waitForResponse(response => new URL(response.url()).pathname === `/api/chat/conversations/${conversation.id}/messages` && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click()
  const sent = await sentPromise
  expect(sent.status()).toBe(201)
  const messages = await sent.json()
  expect(messages.aiMessage.content.includes(marker), 'Gemini deve responder com evidência real do anexo').toBe(true)
  expect(messages.aiMessage.content.startsWith('**IA generativa indisponível.**')).toBe(false)
  expect(messages.userMessage.attachments.length).toBe(1)
  await page.goto(`/aluno/chat/${conversation.id}`)
  const download = page.getByRole('button', { name: `Baixar anexo ${filename}`, exact: true })
  await expect(download).toBeVisible()
  await downloadMatches(page, download, bytes)
  const persisted = await api(page, `/api/chat/conversations/${conversation.id}`)
  expect(persisted.status).toBe(200)
  const saved = persisted.data.messages.find((message: any) => message.id === messages.userMessage.id)
  expect(saved.attachments[0].name).toBe(filename)
  expect(persisted.data.messages.some((message: any) => message.id === messages.aiMessage.id && message.content === messages.aiMessage.content)).toBe(true)
  await evidence(page, info, 'student-chat-attachment')
  await info.attach('controlled-record', { body: Buffer.from(JSON.stringify({ kind: 'test-conversation', id: conversation.id, attachmentBytesPreserved: true, persisted: true })), contentType: 'application/json' })
})
