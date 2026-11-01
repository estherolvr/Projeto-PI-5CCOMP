import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setImmediate } from 'node:timers/promises'
import { PrismaClient } from '@prisma/client'
import { prisma, withDatabaseClient } from '../src/db'

test('concurrent requests retain their own database across asynchronous work', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'alvaro-db-context-'))
  const paths = [join(directory, 'first.db'), join(directory, 'second.db')]
  const clients = paths.map(path => new PrismaClient({ datasources: { db: { url: `file:${path}` } } }))
  try {
    await Promise.all(clients.map((client, index) => withDatabaseClient(client, async () => {
      await setImmediate()
      const before = await prisma.$queryRaw<Array<{ file: string }>>`PRAGMA database_list`
      await setImmediate()
      const after = await prisma.$queryRaw<Array<{ file: string }>>`PRAGMA database_list`
      assert.equal(before[0].file, paths[index])
      assert.equal(after[0].file, paths[index])
    })))
  } finally {
    await Promise.all(clients.map(client => client.$disconnect()))
    rmSync(directory, { recursive: true, force: true })
  }
})
