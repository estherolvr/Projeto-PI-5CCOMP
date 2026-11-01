import { Client } from '../src/Entrega 1/Backend/node_modules/pg'
import { PrismaClient } from '../src/Entrega 1/Backend/generated/postgresql/wasm.js'
import { PrismaPg } from '../src/Entrega 1/Backend/node_modules/@prisma/adapter-pg'
export default {
  async fetch(request: Request, env: any) {
    if (Date.now() > Number(env.EXPIRES_AT)) return new Response('Expired', {status:410})
    if (!env.DIAGNOSTIC_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.DIAGNOSTIC_TOKEN}`) return new Response('Unauthorized', {status:401})
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/check') return new Response('Not found', {status:404})
    const result: any = {}
    const client = new Client({connectionString:env.HYPERDRIVE.connectionString,connectionTimeoutMillis:10000,query_timeout:10000})
    client.on('error',()=>{})
    try {
      await client.connect()
      const rows=await client.query('SELECT 1 AS connection_ok')
      result.pg=rows.rows[0]?.connection_ok === 1 ? 'connected' : 'unexpected_result'
    } catch (error: any) {result.pg={code:error.code || null,message:String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]').slice(0,250)}}
    finally {await client.end().catch(()=>{})}
    const prisma = new PrismaClient({adapter:new PrismaPg({connectionString:env.HYPERDRIVE.connectionString,max:1,connectionTimeoutMillis:10000})})
    try {
      await prisma.$queryRaw`SELECT 1`
      result.prisma='connected'
    } catch(error: any) {result.prisma={code:error.code || null,message:String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]').slice(0,250)}}
    finally {await prisma.$disconnect().catch(()=>{})}
    return Response.json(result,{headers:{'Cache-Control':'no-store'}})
  }
}
