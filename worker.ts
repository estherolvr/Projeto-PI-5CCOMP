import { httpServerHandler } from 'cloudflare:node'
import { env, waitUntil } from 'cloudflare:workers'
import { createServer } from 'node:http'
import { withRuntimeContext } from './src/Entrega 1/Backend/src/services/runtime-context'
import app from './src/Entrega 1/Backend/src/app'
import { createPostgresClient, ensureFirstAccessSchema, withDatabaseClient } from './src/Entrega 1/Backend/src/db'

let firstAccessSchemaBootstrap: Promise<void> | undefined

const server = createServer((request, response) => {
  const database = createPostgresClient(env.HYPERDRIVE.connectionString)
  let released = false
  const release = () => {
    if (released) return
    released = true
    waitUntil(database.$disconnect().catch(() => {}))
  }
  response.once('finish', release)
  response.once('close', release)
  const handleRequest = async () => {
    if (!firstAccessSchemaBootstrap) firstAccessSchemaBootstrap = ensureFirstAccessSchema(database)
    await firstAccessSchemaBootstrap
    withRuntimeContext({ storage: env.STORAGE, pdfExtractor: env.PDF_EXTRACTOR, waitUntil }, () => withDatabaseClient(database, () => app(request, response)))
  }
  handleRequest().catch(error => {
    firstAccessSchemaBootstrap = undefined
    console.error('Database schema bootstrap failed:', error)
    if (!response.headersSent) response.writeHead(503, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: 'Serviço temporariamente indisponível.' }))
  })
})
server.listen(3001)
export default httpServerHandler({ port: 3001 })
