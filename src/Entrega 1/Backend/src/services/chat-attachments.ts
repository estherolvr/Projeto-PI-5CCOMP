import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { RequestHandler } from 'express'
import { extractPdfText } from '@alvaro/pdf-extractor'
import { r2Service } from './r2.service'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 10 * 1024 * 1024
const MAX_TEXT_CHARS = 120_000
export interface StoredChatAttachment {
  id: string; name: string; type: string; size: number; storageKey: string; textKey: string
}
export interface ChatAttachmentContext { name: string; content: string }
export class ChatAttachmentError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 3, fields: 2, fieldSize: 12_000 } }).array('files', 3)
export const chatUpload: RequestHandler = (req, res, next) => upload(req, res, error => {
  if (!error) return next()
  res.status(400).json({ error: 'Envie até 3 arquivos PDF, TXT ou MD, com até 5 MB por arquivo e 10 MB no total.' })
})

export function storedChatAttachments(actions: string | null | undefined): StoredChatAttachment[] {
  try {
    const parsed = JSON.parse(actions || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(a => a?.action === 'download_attachment' && a.attachment?.id && a.attachment?.storageKey && a.attachment?.textKey).map(a => a.attachment)
  } catch { return [] }
}

/** Private object keys stay in storage metadata, never in API responses. */
export function publicChatMessage<T extends { actions?: string | null }>(message: T) {
  let actions: any[] = []
  try { const parsed = JSON.parse(message.actions || '[]'); if (Array.isArray(parsed)) actions = parsed } catch {}
  return {
    ...message,
    actions: actions.filter(action => action?.action !== 'download_attachment'),
    attachments: storedChatAttachments(message.actions).map(({ id, name, size, type }) => ({ id, name, size, type })),
  }
}

export async function removeChatAttachments(files: StoredChatAttachment[]) {
  await Promise.all(files.flatMap(file => [file.storageKey, file.textKey]).map(key => r2Service.deleteObject(key).catch(() => false)))
}

export async function saveChatAttachments(conversationId: string, files: Express.Multer.File[]) {
  if (!files.length) return { attachments: [] as StoredChatAttachment[], contexts: [] as ChatAttachmentContext[] }
  if (files.length > 3 || files.some(f => f.size > MAX_FILE_BYTES) || files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
    throw new ChatAttachmentError('Envie até 3 arquivos, com até 5 MB cada e 10 MB no total.')
  }
  if (!r2Service.isConfigured()) throw new ChatAttachmentError('Armazenamento indisponível. Os anexos não foram enviados; tente novamente.', 503)
  const prepared: Array<{ file: Express.Multer.File; name: string; type: string; text: string }> = []
  for (const file of files) {
    const name = file.originalname.replace(/\\/g, '/').split('/').at(-1)!.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180)
    const extension = name.split('.').at(-1)?.toLowerCase()
    if (!['pdf', 'txt', 'md'].includes(extension || '')) throw new ChatAttachmentError('O chat aceita arquivos PDF, TXT e Markdown (.md).')
    if (!file.size) throw new ChatAttachmentError(`O arquivo ${name} está vazio.`)
    let text: string
    if (extension === 'pdf') {
      if (!file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new ChatAttachmentError('O arquivo enviado não é um PDF válido.', 422)
      try { text = await extractPdfText(file.buffer) }
      catch { throw new ChatAttachmentError('Não foi possível ler o PDF. Envie um PDF com texto selecionável, TXT ou MD.', 422) }
    } else {
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer) }
      catch { throw new ChatAttachmentError('Envie os arquivos de texto na codificação UTF-8.', 422) }
      if (text.includes('\0')) throw new ChatAttachmentError('O arquivo de texto contém conteúdo binário.', 422)
    }
    text = text.trim()
    if (!text) throw new ChatAttachmentError('O arquivo não contém texto legível.', 422)
    prepared.push({ file, name, type: extension === 'pdf' ? 'application/pdf' : 'text/plain; charset=utf-8', text })
  }
  if (prepared.reduce((sum, f) => sum + f.text.length, 0) > MAX_TEXT_CHARS) {
    throw new ChatAttachmentError('O texto dos anexos ultrapassa 120 mil caracteres. Envie documentos menores.', 413)
  }
  const attachments: StoredChatAttachment[] = []
  const contexts: ChatAttachmentContext[] = []
  try {
    for (const item of prepared) {
      const id = randomUUID(), prefix = `chat-attachments/${conversationId}/${id}`
      const attachment = { id, name: item.name, type: item.type, size: item.file.size, storageKey: `${prefix}/original`, textKey: `${prefix}/text` }
      // Track both keys before writes so a partial object upload is also cleaned up.
      attachments.push(attachment)
      await r2Service.uploadBuffer(attachment.storageKey, item.file.buffer, item.type)
      await r2Service.uploadBuffer(attachment.textKey, Buffer.from(item.text), 'text/plain; charset=utf-8')
      contexts.push({ name: item.name, content: item.text })
    }
    return { attachments, contexts }
  } catch {
    await removeChatAttachments(attachments)
    throw new ChatAttachmentError('Não foi possível armazenar os anexos. Tente novamente.', 503)
  }
}

/** Reuse attachments from recent messages for follow-up questions, within a bounded context. */
export async function recentAttachmentContexts(messages: Array<{ actions?: string | null }>, current: ChatAttachmentContext[]) {
  const result = [...current]
  let remaining = MAX_TEXT_CHARS - result.reduce((sum, file) => sum + file.content.length, 0)
  const previous = messages.flatMap(m => storedChatAttachments(m.actions)).reverse()
  if (previous.length && result.length < 3 && !r2Service.isConfigured()) throw new ChatAttachmentError('Armazenamento de anexos indisponível. Tente novamente.', 503)
  for (const file of previous) {
    if (result.length >= 3 || remaining <= 0) break
    const saved = await r2Service.getFile(file.textKey)
    if (!saved) throw new ChatAttachmentError('Não foi possível recuperar um anexo desta conversa. Tente novamente.', 503)
    const text = saved.buffer.toString('utf8')
    if (text.length > remaining) continue
    result.push({ name: file.name, content: text })
    remaining -= text.length
  }
  return result
}
