import { geminiFailureDiagnostic } from './gemini-diagnostics'

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

const DIAGNOSTIC_GEMINI_MODELS = new Set(['gemini-3.5-flash-lite'])

function resolveProbeModel(env: NodeJS.ProcessEnv, modelOverride?: string) {
  const configuredModel = (env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim()
  if (!modelOverride) return configuredModel
  if (modelOverride === configuredModel || DIAGNOSTIC_GEMINI_MODELS.has(modelOverride)) return modelOverride
  return null
}

async function readProviderStatus(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { status?: unknown } } | null
  return typeof body?.error?.status === 'string' && /^[A-Z][A-Z0-9_]{0,49}$/.test(body.error.status)
    ? body.error.status
    : undefined
}

/** Read-only Google API probe. It validates access to model metadata without generating content. */
export async function probeGeminiModel(env = process.env, timeoutMs = 10_000, modelOverride?: string) {
  const apiKey = (env.GEMINI_API_KEY || '').trim()
  const model = resolveProbeModel(env, modelOverride)
  const configured = Boolean(apiKey && apiKey !== 'sua_chave_gemini_aqui' && apiKey.length > 10)

  if (!model) {
    return { provider: 'google-gemini', model: 'unsupported', configured, available: false, category: 'model_not_allowed' as const }
  }
  if (!configured) {
    return { provider: 'google-gemini', model, configured: false, available: false, category: 'missing_api_key' as const }
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
      signal: controller.signal,
    })
    const latencyMs = Date.now() - startedAt
    if (response.ok) {
      const metadata = await response.json().catch(() => null) as { supportedGenerationMethods?: unknown } | null
      const supportedMethods = Array.isArray(metadata?.supportedGenerationMethods)
        ? metadata.supportedGenerationMethods.filter((method): method is string =>
          typeof method === 'string' && ['generateContent', 'countTokens', 'embedContent', 'batchGenerateContent'].includes(method))
        : []
      return {
        provider: 'google-gemini', model, configured: true, available: true,
        generateContentSupported: supportedMethods.includes('generateContent'),
        supportedMethods, httpStatus: response.status, latencyMs,
      }
    }

    const providerStatus = await readProviderStatus(response)
    const diagnostic = geminiFailureDiagnostic('health_probe', model, {
      name: 'GoogleGeminiHealthProbeError', status: response.status, statusText: response.statusText, providerStatus,
    })
    return {
      provider: 'google-gemini', model, configured: true, available: false,
      httpStatus: response.status, category: diagnostic.category,
      ...(diagnostic.providerStatus ? { providerStatus: diagnostic.providerStatus } : {}), latencyMs,
    }
  } catch (error) {
    const diagnostic = geminiFailureDiagnostic('health_probe', model, error)
    return {
      provider: 'google-gemini', model, configured: true, available: false,
      category: diagnostic.category, errorName: diagnostic.errorName, code: diagnostic.code,
      latencyMs: Date.now() - startedAt,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/** On-demand, fixed-prompt generation probe used to compare REST inference with the SDK path. */
export async function probeGeminiGeneration(env = process.env, timeoutMs = 20_000, modelOverride?: string) {
  const apiKey = (env.GEMINI_API_KEY || '').trim()
  const model = resolveProbeModel(env, modelOverride)
  const configured = Boolean(apiKey && apiKey !== 'sua_chave_gemini_aqui' && apiKey.length > 10)

  if (!model) {
    return { provider: 'google-gemini', model: 'unsupported', configured, available: false, category: 'model_not_allowed' as const }
  }
  if (!configured) {
    return { provider: 'google-gemini', model, configured: false, available: false, category: 'missing_api_key' as const }
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Responda apenas com: OK' }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
      signal: controller.signal,
    })
    const latencyMs = Date.now() - startedAt
    if (!response.ok) {
      const providerStatus = await readProviderStatus(response)
      const diagnostic = geminiFailureDiagnostic('generation_probe', model, {
        name: 'GoogleGeminiGenerationProbeError', status: response.status, statusText: response.statusText, providerStatus,
      })
      return {
        provider: 'google-gemini', model, configured: true, available: false,
        httpStatus: response.status, category: diagnostic.category,
        ...(diagnostic.providerStatus ? { providerStatus: diagnostic.providerStatus } : {}), latencyMs,
      }
    }

    const result = await response.json().catch(() => null) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> }; finishReason?: unknown }>
    } | null
    const candidate = result?.candidates?.[0]
    const hasOutput = Boolean(candidate?.content?.parts?.some(part => typeof part.text === 'string' && part.text.length > 0))
    const finishReason = typeof candidate?.finishReason === 'string'
      && /^[A-Z_]{1,40}$/.test(candidate.finishReason) ? candidate.finishReason : undefined
    return {
      provider: 'google-gemini', model, configured: true, available: hasOutput,
      httpStatus: response.status, hasOutput, ...(finishReason ? { finishReason } : {}), latencyMs,
    }
  } catch (error) {
    const diagnostic = geminiFailureDiagnostic('generation_probe', model, error)
    return {
      provider: 'google-gemini', model, configured: true, available: false,
      category: diagnostic.category, errorName: diagnostic.errorName, code: diagnostic.code,
      latencyMs: Date.now() - startedAt,
    }
  } finally {
    clearTimeout(timeout)
  }
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
