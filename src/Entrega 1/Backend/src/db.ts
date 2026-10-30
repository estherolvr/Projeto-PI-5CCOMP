import { PrismaClient } from '@prisma/client'
import { databaseUrl } from './database-config'

export const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
