// Read-only database diagnostic. Reads DATABASE_URL, never prints its value.
const { Client } = require('../src/Entrega 1/Backend/node_modules/pg')

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL no ambiente antes de executar.')
  const url = new URL(process.env.DATABASE_URL)
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error('DATABASE_URL deve usar PostgreSQL.')
  const configuration = {
    postgres: true,
    transactionPooler: url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543',
    hasUser: Boolean(url.username),
    hasPassword: Boolean(url.password),
    tlsRequested: ['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode')),
  }
  console.log('Configuração:', JSON.stringify(configuration))
  if (process.argv.includes('--check-config')) return
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 10000 })
  let phase = 'TCP'
  client.connection.on('connect', () => { phase = 'TLS/autenticação'; console.log('Socket TCP conectado.') })
  client.connection.on('sslconnect', () => { phase = 'autenticação'; console.log('Negociação TLS iniciada.') })
  try {
    await client.connect()
    phase = 'consulta'
    console.log('Autenticação PostgreSQL concluída.')
    const result = await client.query('SELECT 1 AS connection_ok')
    if (result.rows[0]?.connection_ok !== 1) throw new Error('Resposta inesperada à consulta.')
    console.log('SUCESSO: SELECT 1 concluído; conexão independente funciona.')
  } catch (error) {
    // Do not print raw messages, hostnames, connection URLs, or passwords.
    console.error(JSON.stringify({ status: 'failed', phase, code: error.code || null, name: error.name,
      connectionTerminated: /terminated unexpectedly/.test(error.message),
      authenticationFailed: error.code === '28P01',
      timedOut: /timeout|timed out/i.test(error.message),
      tlsError: /certificate|TLS|SSL/i.test(error.message),
    }))
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
}
main().catch(error => { console.error(error.name === 'TypeError' ? 'DATABASE_URL inválida.' : error.message); process.exitCode = 1 })
