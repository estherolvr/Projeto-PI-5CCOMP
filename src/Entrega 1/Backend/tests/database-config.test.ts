import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { resolveDatabaseUrl } from '../src/database-config'

test('runtime and database commands resolve the default and relative SQLite paths from the schema', () => {
  assert.equal(resolveDatabaseUrl(), `file:${resolve('prisma/dev.db').replaceAll('\\', '/')}`)
  assert.equal(resolveDatabaseUrl('file:../work/test.db?connection_limit=1'), `file:${resolve('work/test.db').replaceAll('\\', '/')}?connection_limit=1`)
})

test('explicit deployment SQLite paths are preserved', () => {
  assert.equal(resolveDatabaseUrl('file:/var/data/institution.db'), 'file:/var/data/institution.db')
  assert.equal(resolveDatabaseUrl('file:D:\\data\\institution.db'), 'file:D:/data/institution.db')
})
