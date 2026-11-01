import postgres from '../node_modules/postgres/cf/src/index.js'
import { connect } from 'cloudflare:sockets'
import { Client } from '../src/Entrega 1/Backend/node_modules/pg'

function safeError(error: any) {
  return {
    code: typeof error.code === 'string' ? error.code : null,
    message: String(error.message || '').replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]').slice(0, 250),
    terminated: /terminated unexpectedly/i.test(error.message || ''),
    certificate: /certificate|self.signed/i.test(error.message || ''),
    timeout: /timeout|timed out/i.test(error.message || ''),
    authentication: error.code === '28P01',
  }
}

export default {
  async fetch(request: Request, env: any) {
    if (Date.now() > Number(env.EXPIRES_AT)) return new Response('Expired', { status: 410 })
    if (!env.DIAGNOSTIC_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.DIAGNOSTIC_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 })
    }
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/check') return new Response('Not found', { status: 404 })
    const url = new URL(env.DATABASE_URL)
    const requestedPort = new URL(request.url).searchParams.get('port')
    if (!['5432', '6543'].includes(requestedPort || '')) return new Response('Invalid port', { status: 400 })
    url.port = requestedPort!
    if (new URL(request.url).searchParams.get('endpoint') === 'direct') {
      const parts = decodeURIComponent(url.username).split('.')
      const project = parts.pop()
      if (!project || !/^[a-z0-9]{20}$/.test(project)) return new Response('Invalid project', { status: 400 })
      url.hostname = `db.${project}.supabase.co`
      url.port = '5432'
      url.username = parts.join('.')
    }
    const probe = new URL(request.url).searchParams.get('probe')
    if (probe === 'postgres') url.username = 'postgres.' + decodeURIComponent(url.username).split('.').slice(1).join('.')
    if (probe === 'plaintext-startup') {
      const raw = connect({ hostname: url.hostname, port: Number(url.port || 5432) })
      const timeout = setTimeout(() => raw.close(), 8000)
      try {
        await raw.opened
        const body = new TextEncoder().encode(`user\0${decodeURIComponent(url.username)}\0database\0${decodeURIComponent(url.pathname.slice(1))}\0client_encoding\0UTF8\0\0`)
        const packet = new Uint8Array(body.length + 8)
        const view = new DataView(packet.buffer)
        view.setInt32(0, packet.length); view.setInt32(4, 196608); packet.set(body, 8)
        const writer = raw.writable.getWriter(); await writer.write(packet); writer.releaseLock()
        const reader = raw.readable.getReader(); const response = await reader.read(); reader.releaseLock()
        const result: any = { passwordSent: false, response: response.done ? 'closed' : String.fromCharCode(response.value[0]) }
        if (response.value?.[0] === 82 && response.value.length >= 9) result.authenticationMethod = new DataView(response.value.buffer, response.value.byteOffset).getInt32(5)
        if (response.value?.[0] === 69) {
          const fields = new TextDecoder().decode(response.value.slice(5)).split('\0')
          result.serverCode = fields.find(field => field.startsWith('C'))?.slice(1)
          result.serverMessage = fields.find(field => field.startsWith('M'))?.slice(1)
        }
        return Response.json(result)
      } catch (error) { return Response.json({ error: safeError(error), passwordSent: false }) }
      finally { clearTimeout(timeout); await raw.close().catch(() => {}) }
    }
    const result: any = { port: Number(url.port), transport: { stage: 'tcp' }, postgres: { stage: 'not_started' } }
    let socket: any
    let timer: any
    try {
      socket = connect({ hostname: url.hostname, port: Number(url.port || 5432) }, { secureTransport: 'starttls' })
      timer = setTimeout(() => socket?.close(), 10000)
      await socket.opened
      result.transport.stage = 'postgres_ssl_request'
      const writer = socket.writable.getWriter()
      await writer.write(new Uint8Array([0, 0, 0, 8, 4, 210, 22, 47]))
      writer.releaseLock()
      const reader = socket.readable.getReader()
      const { value } = await reader.read()
      reader.releaseLock()
      if (!value || value[0] !== 83) throw new Error('Server did not accept TLS')
      result.transport.stage = 'tls'
      socket = socket.startTls({ expectedServerHostname: url.hostname })
      await socket.opened
      result.transport.stage = 'tls_connected'
      const encoder = new TextEncoder()
      const body = encoder.encode(`user\0${decodeURIComponent(url.username)}\0database\0${decodeURIComponent(url.pathname.slice(1))}\0client_encoding\0UTF8\0\0`)
      const packet = new Uint8Array(body.length + 8)
      const view = new DataView(packet.buffer)
      view.setInt32(0, packet.length)
      view.setInt32(4, 196608)
      packet.set(body, 8)
      const tlsWriter = socket.writable.getWriter()
      await tlsWriter.write(packet)
      tlsWriter.releaseLock()
      const tlsReader = socket.readable.getReader()
      const response = await tlsReader.read()
      tlsReader.releaseLock()
      result.transport.startupResponse = response.done ? 'closed' : String.fromCharCode(response.value[0])
      if (response.value?.[0] === 82 && response.value.length >= 9) result.transport.authenticationMethod = new DataView(response.value.buffer, response.value.byteOffset).getInt32(5)
      if (response.value?.[0] === 69) {
        const fields = new TextDecoder().decode(response.value.slice(5)).split('\0')
        result.transport.serverCode = fields.find(field => field.startsWith('C'))?.slice(1)
        result.transport.serverMessage = fields.find(field => field.startsWith('M'))?.slice(1)
      }
    } catch (error) {
      result.transport.error = safeError(error)
    } finally {
      clearTimeout(timer)
      await socket?.close().catch(() => {})
    }
    if (probe) return Response.json({ transport: result.transport }, { headers: { 'Cache-Control': 'no-store' } })
    const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000, query_timeout: 10000 })
    client.connection.on('connect', () => { result.postgres.stage = 'tcp_connected' })
    client.connection.on('sslconnect', () => { result.postgres.stage = 'tls_authentication' })
    client.on('error', () => {})
    try {
      await client.connect()
      result.postgres.stage = 'authenticated'
      const query = await client.query('SELECT 1 AS connection_ok')
      result.postgres.stage = query.rows[0]?.connection_ok === 1 ? 'query_ok' : 'unexpected_result'
    } catch (error) {
      result.postgres.error = safeError(error)
    } finally {
      await client.end().catch(() => {})
    }
    const sql = postgres(url.toString(), { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 1, ssl: { rejectUnauthorized: true } })
    try {
      const rows: any = await Promise.race([sql`SELECT 1 AS connection_ok`, new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 12000))])
      result.alternativeDriver = { stage: rows[0]?.connection_ok === 1 ? 'query_ok' : 'unexpected_result' }
    } catch (error) {
      result.alternativeDriver = { error: safeError(error) }
    } finally {
      await sql.end({ timeout: 1 }).catch(() => {})
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  },
}
