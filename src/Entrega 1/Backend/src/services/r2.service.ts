import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import https from 'https'
import dotenv from 'dotenv'

dotenv.config()

class R2StorageService {
  private client: S3Client | null = null
  private bucket: string
  private accountId: string

  constructor() {
    this.accountId = process.env.R2_ACCOUNT_ID || ''
    this.bucket = process.env.R2_BUCKET_NAME || 'alvaro-ai-storage'

    const accessKeyId = process.env.R2_ACCESS_KEY_ID || ''
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ''

    if (this.accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        requestHandler: new NodeHttpHandler({
          httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? false : undefined,
          }),
        }),
      })
      console.log(`☁️ Cloudflare R2 inicializado com sucesso (Bucket: ${this.bucket})`)
    } else {
      console.warn('⚠️ Cloudflare R2: credenciais ausentes no .env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME). Operando em modo de espera.')
    }
  }

  public isConfigured(): boolean {
    return !!this.client && !!this.bucket
  }

  /**
   * Envia um buffer binário para o bucket R2
   */
  public async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.client) {
      throw new Error('Cloudflare R2 não configurado.')
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await this.client.send(command)
    return key
  }

  /**
   * Converte Data URL Base64 e salva no R2
   */
  public async uploadBase64(key: string, base64DataUrl: string): Promise<{ key: string; sizeBytes: number; contentType: string }> {
    const matches = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    let contentType = 'application/octet-stream'
    let buffer: Buffer

    if (matches && matches.length === 3) {
      contentType = matches[1]
      buffer = Buffer.from(matches[2], 'base64')
    } else {
      buffer = Buffer.from(base64DataUrl, 'base64')
    }

    await this.uploadBuffer(key, buffer, contentType)
    return { key, sizeBytes: buffer.length, contentType }
  }

  /**
   * Salva um snapshot estruturado da conversa com a IA no R2
   * Local: conversas/{studentId}/{conversationId}.json
   */
  public async saveConversationSnapshot(
    conversationId: string,
    studentId: string,
    conversationData: {
      title?: string
      student?: any
      messages: any[]
      updatedAt?: Date | string
      metadata?: Record<string, any>
    }
  ): Promise<string | null> {
    if (!this.client) {
      return null
    }

    try {
      const key = `conversas/${studentId}/${conversationId}.json`
      const snapshot = {
        conversationId,
        studentId,
        title: conversationData.title || 'Conversa Álvaro AI',
        student: conversationData.student || null,
        messageCount: conversationData.messages.length,
        syncedAt: new Date().toISOString(),
        updatedAt: conversationData.updatedAt || new Date().toISOString(),
        messages: conversationData.messages,
        metadata: {
          platform: 'alvaro-ai',
          compliance: 'LGPD Art. 7º - Histórico Acadêmico Institucional',
          ...conversationData.metadata,
        },
      }

      const buffer = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf-8')
      await this.uploadBuffer(key, buffer, 'application/json')
      console.log(`💾 Snapshot da conversa sincronizado no Cloudflare R2: ${key}`)
      return key
    } catch (error) {
      console.error(`Erro ao salvar conversa no R2 (${conversationId}):`, error)
      return null
    }
  }

  /**
   * Recupera o snapshot da conversa do R2
   */
  public async getConversationSnapshot(conversationId: string, studentId: string): Promise<any | null> {
    if (!this.client) return null

    try {
      const key = `conversas/${studentId}/${conversationId}.json`
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.client.send(command)
      if (!response.Body) return null

      const text = await response.Body.transformToString()
      return JSON.parse(text)
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null
      }
      console.error(`Erro ao buscar snapshot do R2 (${conversationId}):`, error)
      return null
    }
  }

  /**
   * Gera uma URL pré-assinada segura (temporária) para download/visualização
   */
  public async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string | null> {
    if (!this.client) return null

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
    } catch (error) {
      console.error(`Erro ao gerar Presigned URL (${key}):`, error)
      return null
    }
  }

  /**
   * Remove um objeto do bucket R2
   */
  public async deleteObject(key: string): Promise<boolean> {
    if (!this.client) return false

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      await this.client.send(command)
      return true
    } catch (error) {
      console.error(`Erro ao deletar objeto no R2 (${key}):`, error)
      return false
    }
  }
}

export const r2Service = new R2StorageService()
