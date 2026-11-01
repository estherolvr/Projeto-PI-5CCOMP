import { AsyncLocalStorage } from 'node:async_hooks'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { databaseUrl } from './database-config'

const requestDatabase = new AsyncLocalStorage<PrismaClient>()
let localClient: PrismaClient | undefined

export function createPostgresClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 2, connectionTimeoutMillis: 10000 }) })
}

export function withDatabaseClient<T>(client: PrismaClient, callback: () => T): T {
  return requestDatabase.run(client, callback)
}

function getClient(): PrismaClient {
  const scoped = requestDatabase.getStore()
  if (scoped) return scoped
  if (!localClient) {
    const options: Prisma.PrismaClientOptions = databaseUrl.startsWith('postgres')
      ? { adapter: new PrismaPg({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000 }) }
      : { datasources: { db: { url: databaseUrl } } }
    localClient = new PrismaClient(options)
  }
  return localClient
}

// Routes keep the same API while Worker requests receive independent clients.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
