import 'dotenv/config'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const schemaDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'prisma')

/** Match Prisma's schema-relative SQLite paths for both runtime and database commands. */
export function resolveDatabaseUrl(configuredUrl?: string): string {
  const url = configuredUrl?.trim() || 'file:./dev.db'
  if (!url.startsWith('file:')) return url
  const value = url.slice('file:'.length)
  const queryIndex = value.indexOf('?')
  const path = queryIndex < 0 ? value : value.slice(0, queryIndex)
  const query = queryIndex < 0 ? '' : value.slice(queryIndex)
  if (isAbsolute(path) || /^[A-Za-z]:[\\/]/.test(path)) return `file:${path.replaceAll('\\', '/')}${query}`
  return `file:${resolve(schemaDirectory, path).replaceAll('\\', '/')}${query}`
}

export const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL)
