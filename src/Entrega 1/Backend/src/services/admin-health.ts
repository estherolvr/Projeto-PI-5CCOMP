export async function operationalHealth(checkDatabase: () => Promise<unknown>, env = process.env) {
  const checkedAt = new Date().toISOString()
  const checks = [{
    id: 'backend', label: 'API Backend', status: 'operacional',
    detail: 'A API respondeu a esta consulta.', checkedAt, latencyMs: null as number | null,
  }]
  const started = Date.now()
  try {
    await checkDatabase()
    checks.push({ id: 'database', label: 'Banco de dados', status: 'operacional', detail: 'Consulta de conexão executada com sucesso.', checkedAt, latencyMs: Date.now() - started })
  } catch {
    checks.push({ id: 'database', label: 'Banco de dados', status: 'indisponivel', detail: 'A consulta de conexão falhou.', checkedAt, latencyMs: Date.now() - started })
  }
  const hasValue = (key: string) => Boolean(env[key]?.trim() && !/^(sua?_|seu_|your_|replace_|example|placeholder|changeme)/i.test(env[key]!.trim()))
  const geminiConfigured = hasValue('GEMINI_API_KEY')
  const r2Configured = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every(hasValue)
  checks.push(
    { id: 'gemini', label: 'Google Gemini IA', status: geminiConfigured ? 'configurado' : 'nao_configurado', detail: geminiConfigured ? 'Chave configurada. Disponibilidade externa não verificada.' : 'Chave de API ausente.', checkedAt, latencyMs: null },
    { id: 'r2', label: 'Cloudflare R2', status: r2Configured ? 'configurado' : 'nao_configurado', detail: r2Configured ? 'Credenciais configuradas. Disponibilidade externa não verificada.' : 'Credenciais de armazenamento incompletas.', checkedAt, latencyMs: null },
  )
  return { checkedAt, checks }
}

/** Integration configuration can include API keys; administration lists only non-secret metadata. */
export function publicIntegrationConfig(raw: string): Record<string, unknown> {
  try {
    const config = JSON.parse(raw || '{}')
    if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
    const allowed = ['provider', 'region', 'bucket', 'model', 'description', 'enabled']
    return Object.fromEntries(Object.entries(config).filter(([key, value]) =>
      allowed.includes(key) && ['string', 'number', 'boolean'].includes(typeof value)))
  } catch { return {} }
}
