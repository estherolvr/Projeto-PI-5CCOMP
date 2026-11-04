import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { RequestHandler } from 'express'
import { r2Service } from './r2.service'

export class AttachmentError extends Error {
  constructor(message: string, public status: number = 400) { super(message) }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 5, fields: 12, fieldSize: 100_000 } }).array('files', 5)
export const receiveTicketFiles: RequestHandler = (req, res, next) => {
  if (req.is('multipart/form-data') && Number(req.headers['content-length']) > 21 * 1024 * 1024) return res.status(413).json({error:'Os anexos devem somar no máximo 20 MB.'})
  upload(req, res, error => {
    if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Cada anexo deve ter no máximo 10 MB.' : 'Envie até 5 anexos nos formatos PDF, JPG ou PNG.' })
    next()
  })
}

export interface StoredTicketFile { name: string; size: string; type: string; url: string }

export async function removeTicketFiles(files: StoredTicketFile[]) {
  await Promise.allSettled(files.map(file => r2Service.deleteObject(file.url.slice('r2://'.length))))
}

export async function storeTicketFiles(files: Express.Multer.File[] = []): Promise<StoredTicketFile[]> {
  if (!files.length) return []
  if (files.length > 5 || files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) throw new AttachmentError('Envie até 5 arquivos, somando no máximo 20 MB.', 413)
  for (const file of files) {
    if (!file.size || file.size > 10 * 1024 * 1024) throw new AttachmentError('Cada anexo deve ter entre 1 byte e 10 MB.', 413)
    const extension = file.originalname.split('.').pop()?.toLowerCase()
    const validPdf = extension === 'pdf' && file.mimetype === 'application/pdf' && file.buffer.subarray(0, 5).toString() === '%PDF-'
    const validPng = extension === 'png' && file.mimetype === 'image/png' && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const validJpg = ['jpg', 'jpeg'].includes(extension || '') && file.mimetype === 'image/jpeg' && file.buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    if (!validPdf && !validPng && !validJpg) throw new AttachmentError('Anexo inválido. Envie um arquivo PDF, JPG ou PNG válido.')
  }
  if (!r2Service.isConfigured()) throw new AttachmentError('Armazenamento indisponível. O chamado não foi enviado; tente novamente.', 503)
  const stored: StoredTicketFile[] = []
  try {
    for (const file of files) {
      const name = file.originalname.replace(/[\\/\r\n]/g, '_').slice(0, 200)
      const key = `tickets/${randomUUID()}/${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      stored.push({ name, size: `${file.size} bytes`, type: file.mimetype, url: `r2://${key}` })
      await r2Service.uploadBuffer(key, file.buffer, file.mimetype)
    }
    return stored
  } catch {
    await removeTicketFiles(stored)
    throw new AttachmentError('Não foi possível armazenar os anexos. Tente novamente.', 503)
  }
}
