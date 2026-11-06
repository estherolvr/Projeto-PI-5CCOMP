import { Router } from 'express'
import { prisma } from '../db'

export const bannerRouter = Router()

bannerRouter.get('/', async (_req, res) => {
  try {
    const banners = await prisma.homeBanner.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    res.json(banners)
  } catch (error) {
    console.error('Erro ao listar banners da home:', error)
    res.status(500).json({ error: 'Não foi possível carregar os destaques da Home.' })
  }
})
