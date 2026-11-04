type UnknownRecord = Record<string, unknown>

export interface GeminiFailureDiagnostic {
  event: 'gemini_request_failed'
  operation: string
  model: string
  category: string
  status?: number
  statusText?: string
  providerStatus?: string
  errorName?: string
  code?: string
}

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' ? value as UnknownRecord : {}
}

function safeIdentifier(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(value)) return undefined
  return value
}

function safeCode(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^[A-Z][A-Z0-9_]{1,39}$/.test(value)) return undefined
  return value
}

function safeStatusText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 40)
  return normalized || undefined
}

function safeProviderStatus(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^[A-Z][A-Z0-9_]{0,49}$/.test(value)) return undefined
  return value
}

function categoryForStatus(status: number, providerStatus?: string): string {
  if (providerStatus === 'UNAVAILABLE') return 'provider_unavailable'
  if (providerStatus === 'RESOURCE_EXHAUSTED') return 'quota_or_rate_limit'
  if (providerStatus === 'UNAUTHENTICATED') return 'invalid_api_key_or_authentication'
  if (providerStatus === 'PERMISSION_DENIED') return 'permission_denied'
  if (status === 400) return 'invalid_request'
  if (status === 401) return 'invalid_api_key_or_authentication'
  if (status === 403) return 'permission_denied'
  if (status === 404) return 'model_or_endpoint_not_found'
  if (status === 408) return 'provider_timeout'
  if (status === 429) return 'quota_or_rate_limit'
  if (status >= 500) return 'provider_server_error'
  return 'provider_http_error'
}

/** Build a safe diagnostic record without retaining provider messages or request content. */
export function geminiFailureDiagnostic(
  operation: string,
  model: string,
  error: unknown,
): GeminiFailureDiagnostic {
  const details = asRecord(error)
  const cause = asRecord(details.cause)
  const status = typeof details.status === 'number' && Number.isInteger(details.status)
    && details.status >= 100 && details.status <= 599
    ? details.status
    : undefined
  const providerStatus = safeProviderStatus(details.providerStatus)
  const errorName = safeIdentifier(details.name)
  const code = safeCode(details.code) || safeCode(cause.code)
  const message = typeof details.message === 'string' ? details.message.toLowerCase() : ''

  let category = status !== undefined ? categoryForStatus(status, providerStatus) : 'sdk_or_response_error'
  if (status === undefined && (
    errorName === 'AbortError' || errorName === 'TimeoutError'
    || code?.includes('TIMEOUT') || /timed? ?out|request aborted/.test(message)
  )) {
    category = 'request_timeout'
  } else if (status === undefined && (
    errorName === 'TypeError' || Boolean(code) || /error fetching from|fetch failed|network/.test(message)
  )) {
    category = 'network_or_runtime_fetch_failure'
  }

  return {
    event: 'gemini_request_failed',
    operation: safeIdentifier(operation) || 'unknown_operation',
    model: /^[A-Za-z0-9._-]{1,100}$/.test(model) ? model : 'unknown_model',
    category,
    ...(status === undefined ? {} : { status }),
    ...(safeStatusText(details.statusText) ? { statusText: safeStatusText(details.statusText) } : {}),
    ...(providerStatus ? { providerStatus } : {}),
    ...(errorName ? { errorName } : {}),
    ...(code ? { code } : {}),
  }
}
