import { Router } from 'express'
import { prisma } from '../db'

export const bannerRouter = Router()

bannerRouter.get('/', async (_req, res) => {
  try {
    const records = await prisma.aIPrompt.findMany({ where: { version: 'home-banner-v1', status: 'ativo' } })
    const banners = records.map(record => {
      const content = JSON.parse(record.content) as { imageUrl: string; linkUrl: string; sortOrder?: number }
      return { id: record.id, title: record.name, description: record.description || null, imageUrl: content.imageUrl, linkUrl: content.linkUrl, sortOrder: content.sortOrder || 0, updatedAt: record.updatedAt }
    }).sort((a, b) => a.sortOrder - b.sortOrder)
    res.json(banners)
  } catch (error) {
    console.error('Erro ao listar banners da home:', error)
    res.status(500).json({ error: 'Não foi possível carregar os destaques da Home.' })
  }
})
