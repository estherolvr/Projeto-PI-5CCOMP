import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { RequestHandler } from 'express'
import { r2Service } from './r2.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } }).single('image')

export const receiveBannerImage: RequestHandler = (req, res, next) => {
  upload(req, res, error => {
    if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 8 MB.' : 'Envie uma imagem JPG ou PNG válida.' })
    next()
  })
}

export function validateBannerImage(file?: Express.Multer.File) {
  if (!file) return
  const validPng = file.mimetype === 'image/png' && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const validJpeg = file.mimetype === 'image/jpeg' && file.buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  if (!validPng && !validJpeg) throw new Error('Envie uma imagem JPG ou PNG válida.')
}

export async function storeBannerImage(file: Express.Multer.File) {
  validateBannerImage(file)
  const extension = file.mimetype === 'image/png' ? 'png' : 'jpg'
  const key = `home-banners/${randomUUID()}.${extension}`
  await r2Service.uploadBuffer(key, file.buffer, file.mimetype)
  return key
}

export async function removeBannerImage(key?: string) {
  if (key) await r2Service.deleteObject(key)
}
