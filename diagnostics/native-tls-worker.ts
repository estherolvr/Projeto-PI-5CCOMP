import { Client } from '../src/Entrega 1/Backend/node_modules/pg'
export default {
  async fetch(request: Request, env: any) {
    try {
    if (Date.now() > Number(env.EXPIRES_AT)) return new Response('Expired', { status: 410 })
    if (!env.DIAGNOSTIC_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.DIAGNOSTIC_TOKEN}`) return new Response('Unauthorized', { status: 401 })
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/check') return new Response('Not found', { status: 404 })
    const url = new URL(env.DATABASE_URL)
    const requestUrl = new URL(request.url)
    const port = requestUrl.searchParams.get('port') || '6543'
    if (!['5432','6543'].includes(port)) return new Response('Invalid port', {status:400})
    url.port = port
    const result: any = { stage: 'connect', port: Number(port), transport: 'node:net/node:tls' }
    const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000, query_timeout: 10000 })
    client.on('error', () => {})
    client.connection.on('connect', () => {result.stage = 'tcp_connected'})
    client.connection.on('sslconnect', () => {
      result.stage = 'tls_start'
      client.connection.stream.on('secureConnect', () => {result.stage = 'tls_ready'; result.authorized = client.connection.stream.authorized})
    })
    try {
      await client.connect(); result.stage = 'authenticated'
      const rows = await client.query('SELECT 1 AS connection_ok')
      result.stage = rows.rows[0]?.connection_ok === 1 ? 'query_ok' : 'unexpected_result'
    } catch (error: any) {
      result.error = { name: error.name, code: error.code || null, message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]').slice(0,250) }
    } finally { await client.end().catch(() => {}) }
    return Response.json(result, {headers:{'Cache-Control':'no-store'}})
    } catch (error: any) { return Response.json({stage:'runtime',code:error.code || null,message:String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]').slice(0,250)}) }
  }
}
