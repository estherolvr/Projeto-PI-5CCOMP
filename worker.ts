import { httpServerHandler } from 'cloudflare:node'
import { env, waitUntil } from 'cloudflare:workers'
import { createServer } from 'node:http'
import { withRuntimeContext } from './src/Entrega 1/Backend/src/services/runtime-context'
import app from './src/Entrega 1/Backend/src/app'
import { createPostgresClient, withDatabaseClient } from './src/Entrega 1/Backend/src/db'

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
  withRuntimeContext({ storage: env.STORAGE, pdfExtractor: env.PDF_EXTRACTOR, waitUntil }, () => withDatabaseClient(database, () => app(request, response)))
})
server.listen(3001)
export default httpServerHandler({ port: 3001 })
