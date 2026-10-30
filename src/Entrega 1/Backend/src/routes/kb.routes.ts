import { Router } from 'express'
import multer from 'multer'
import { createRequire } from 'module'
import { prisma } from '../db'
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth'
import { aiService } from '../services/ai.service'
import { r2Service } from '../services/r2.service'

const require = createRequire(import.meta.url)
const pdfParseModule = require('pdf-parse')

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // 1. pdf-parse v2 (PDFParse class)
    if (pdfParseModule?.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer })
      const res = await parser.getText()
      if (res?.text) return res.text
    }

    // 2. pdf-parse v1 (function)
    if (typeof pdfParseModule === 'function') {
      const res = await pdfParseModule(buffer)
      if (res?.text) return res.text
    }

    if (typeof pdfParseModule?.default === 'function') {
      const res = await pdfParseModule.default(buffer)
      if (res?.text) return res.text
    }

    // 3. Fallback: extração de streams de texto
    const raw = buffer.toString('latin1')
    const matches = raw.match(/\(([^()]+)\)\s*Tj/g) || []
    if (matches.length > 0) {
      return matches.map(m => m.replace(/[()]/g, '').replace(/\s*Tj$/, '')).join(' ')
    }

    return buffer.toString('utf-8')
  } catch (err) {
    console.error('Erro ao extrair texto do PDF:', err)
    return buffer.toString('utf-8')
  }
}

export const kbRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // até 25MB
})

// List / Search knowledge base articles
kbRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { category, search, status } = req.query

    const where: any = {}

    if (category && category !== 'todas') {
      where.category = String(category)
    }

    if (status && status !== 'todos') {
      where.status = String(status)
    }

    if (search) {
      const q = String(search).toLowerCase()
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
        { category: { contains: q } },
        { filename: { contains: q } },
      ]
    }

    const documents = await prisma.kBDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const formatted = documents.map(doc => ({
      ...doc,
      tags: JSON.parse(doc.tags || '[]'),
    }))

    res.json(formatted)
  } catch (error) {
    console.error('Erro ao listar base de conhecimento:', error)
    res.status(500).json({ error: 'Erro ao buscar artigos da base de conhecimento' })
  }
})

// Upload de Documentos Institucionais (PDF, TXT, MD) com extração RAG
kbRouter.post('/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
    }

    const { title, category } = req.body
    const originalName = req.file.originalname
    const mimeType = req.file.mimetype
    let extractedText = ''

    if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
      extractedText = await extractPdfText(req.file.buffer)
    } else {
      // Arquivos de texto, Markdown, JSON, etc.
      extractedText = req.file.buffer.toString('utf-8')
    }

    const cleanContent = extractedText.replace(/\0/g, '').trim()

    if (!cleanContent) {
      return res.status(400).json({ error: 'O arquivo está vazio ou não foi possível extrair o texto legível.' })
    }

    // Processa chunks
    const chunks = aiService.chunkText(cleanContent)
    const docTitle = title || originalName.replace(/\.[^/.]+$/, '')
    const docCategory = category || 'Geral'

    // Auto-gera tags a partir do conteúdo
    const tags = [
      docCategory.toLowerCase(),
      'institucional',
      'documento',
      ...(originalName.toLowerCase().includes('manual') ? ['manual', 'regras'] : []),
      ...(originalName.toLowerCase().includes('financeiro') ? ['financeiro', 'boleto'] : []),
      ...(originalName.toLowerCase().includes('bolsa') ? ['bolsa', 'prouni', 'fies'] : []),
    ]

    const document = await prisma.kBDocument.create({
      data: {
        title: docTitle,
        category: docCategory,
        content: cleanContent,
        author: req.user?.name || 'Equipe ASA',
        status: 'ativo',
        version: '1.0',
        tags: JSON.stringify(tags),
        indexed: true,
        source: 'upload',
        filename: originalName,
        fileSize: req.file.size,
        chunkCount: chunks.length,
      },
    })

    // Sincroniza arquivo binário original no Cloudflare R2
    let r2Key: string | null = null
    if (r2Service.isConfigured() && req.file) {
      try {
        const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
        r2Key = `kb/${document.id}/${sanitized}`
        await r2Service.uploadBuffer(r2Key, req.file.buffer, req.file.mimetype || 'application/pdf')
        await prisma.kBDocument.update({
          where: { id: document.id },
          data: { r2Key },
        })
        console.log(`☁️ Arquivo da Base de Conhecimento enviado ao Cloudflare R2: ${r2Key}`)
      } catch (r2Err: any) {
        console.warn('Falha no upload do arquivo KB para o R2:', r2Err.message)
      }
    }

    // Registra evento de auditoria
    await prisma.auditEvent.create({
      data: {
        userId: req.user?.id,
        userName: req.user?.name || 'Atendente ASA',
        userRole: req.user?.role || 'asa',
        action: 'kb_document_upload',
        resource: 'KBDocument',
        resourceId: document.id,
        details: JSON.stringify({ filename: originalName, chunks: chunks.length, size: req.file.size }),
        severity: 'info',
      },
    })

    return res.status(201).json({
      message: 'Documento processado e indexado na Base de Conhecimento com sucesso!',
      document: {
        ...document,
        tags,
      },
    })
  } catch (error: any) {
    console.error('Erro ao fazer upload de documento:', error)
    res.status(500).json({ error: error.message || 'Erro ao processar e indexar documento' })
  }
})

// Teste de Busca Semântica RAG
kbRouter.get('/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { q } = req.query
    if (!q) {
      return res.status(400).json({ error: 'Termo de busca é obrigatório' })
    }

    const matches = await aiService.searchKnowledgeBase(String(q), 5)
    res.json(matches)
  } catch (error) {
    console.error('Erro na busca semântica:', error)
    res.status(500).json({ error: 'Erro ao executar busca semântica' })
  }
})

// Get single article by ID
kbRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)

    const doc = await prisma.kBDocument.findUnique({
      where: { id },
    })

    if (!doc) {
      return res.status(404).json({ error: 'Artigo não encontrado' })
    }

    await prisma.kBDocument.update({
      where: { id },
      data: { views: { increment: 1 } },
    })

    res.json({
      ...doc,
      tags: JSON.parse(doc.tags || '[]'),
    })
  } catch (error) {
    console.error('Erro ao buscar artigo:', error)
    res.status(500).json({ error: 'Erro ao carregar artigo' })
  }
})

// Create article manually
kbRouter.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, category, content, tags, status, version } = req.body

    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Título, conteúdo e categoria são obrigatórios' })
    }

    const chunks = aiService.chunkText(content)

    const doc = await prisma.kBDocument.create({
      data: {
        title,
        category,
        content,
        version: version || '1.0',
        status: status || 'ativo',
        author: req.user?.name || 'Equipe ASA',
        tags: JSON.stringify(tags || []),
        indexed: true,
        source: 'manual',
        chunkCount: chunks.length,
      },
    })

    res.status(201).json({
      ...doc,
      tags: JSON.parse(doc.tags || '[]'),
    })
  } catch (error) {
    console.error('Erro ao criar artigo:', error)
    res.status(500).json({ error: 'Erro ao salvar artigo na base de conhecimento' })
  }
})

// Update article
kbRouter.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const { title, category, content, tags, status, version } = req.body

    const existing = await prisma.kBDocument.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Artigo não encontrado' })
    }

    const chunks = content ? aiService.chunkText(content) : undefined

    const doc = await prisma.kBDocument.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(content && { content, chunkCount: chunks?.length }),
        ...(version && { version }),
        ...(status && { status }),
        ...(tags && { tags: JSON.stringify(tags) }),
      },
    })

    res.json({
      ...doc,
      tags: JSON.parse(doc.tags || '[]'),
    })
  } catch (error) {
    console.error('Erro ao atualizar artigo:', error)
    res.status(500).json({ error: 'Erro ao atualizar artigo' })
  }
})

// Delete article
kbRouter.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)

    await prisma.kBDocument.delete({
      where: { id },
    })

    res.json({ message: 'Documento excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir artigo:', error)
    res.status(500).json({ error: 'Erro ao remover artigo' })
  }
})


/**
 * GET /api/knowledge-base/:id/download
 * Baixa o arquivo original da Base de Conhecimento hospedado no Cloudflare R2
 */
kbRouter.get('/:id/download', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id)
    const doc = await prisma.kBDocument.findUnique({ where: { id } })
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado' })
    }

    if (doc.r2Key && r2Service.isConfigured()) {
      const presignedUrl = await r2Service.getPresignedUrl(doc.r2Key, 3600)
      if (presignedUrl) {
        return res.redirect(presignedUrl)
      }
    }

    return res.status(404).json({ error: 'Arquivo binário original não localizado no Cloudflare R2.' })
  } catch (error: any) {
    console.error('Erro ao baixar documento do R2:', error)
    res.status(500).json({ error: 'Erro ao gerar download do arquivo' })
  }
})
