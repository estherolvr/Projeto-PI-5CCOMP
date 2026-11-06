import { Router } from 'express'
import { prisma } from '../db'
import { r2Service } from '../services/r2.service'

export const bannerRouter = Router()

bannerRouter.get('/', async (_req, res) => {
  try {
    const records = await prisma.aIPrompt.findMany({ where: { version: 'home-banner-v1', status: 'ativo' } })
    const banners = records.map(record => {
      const content = JSON.parse(record.content) as { imageUrl?: string; imageKey?: string; linkUrl: string; sortOrder?: number; focalX?:number; focalY?:number }
      return { id: record.id, title: record.name, description: record.description || null, imageUrl: content.imageKey ? `/api/banners/${record.id}/image` : content.imageUrl, linkUrl: content.linkUrl, sortOrder: content.sortOrder || 0, focalX:content.focalX??50, focalY:content.focalY??50, updatedAt: record.updatedAt }
    }).sort((a, b) => a.sortOrder - b.sortOrder)
    res.json(banners)
  } catch (error) {
    console.error('Erro ao listar banners da home:', error)
    res.status(500).json({ error: 'Não foi possível carregar os destaques da Home.' })
  }
})

bannerRouter.get('/:id/image', async (req, res) => {
  try {
    const record = await prisma.aIPrompt.findUnique({ where: { id:String(req.params.id), version:'home-banner-v1' }, select:{ content:true } })
    if (!record) return res.status(404).end()
    const key = (JSON.parse(record.content) as {imageKey?:string}).imageKey
    if (!key) return res.status(404).end()
    const file = await r2Service.getFile(key)
    if (!file) return res.status(404).end()
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    res.send(file.buffer)
  } catch { res.status(500).end() }
})
