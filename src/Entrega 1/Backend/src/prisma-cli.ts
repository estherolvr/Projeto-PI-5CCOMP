import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { databaseUrl } from './database-config'

const require = createRequire(import.meta.url)
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl },
})
if (result.error) {
  console.error('Não foi possível executar o comando Prisma:', result.error.message)
}
process.exit(result.status ?? 1)
