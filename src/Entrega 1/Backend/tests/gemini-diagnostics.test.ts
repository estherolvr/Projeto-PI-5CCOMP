import test from 'node:test'
import assert from 'node:assert/strict'
import { geminiFailureDiagnostic } from '../src/services/gemini-diagnostics'
import { probeGeminiGeneration, probeGeminiModel } from '../src/services/admin-health'

test('Gemini HTTP failures expose safe status categories', () => {
  assert.deepEqual(
    geminiFailureDiagnostic('chat_response', 'gemini-3.8-flash', {
      name: 'GoogleGenerativeAIFetchError', status: 401, statusText: 'Unauthorized',
    }),
    {
      event: 'gemini_request_failed', operation: 'chat_response', model: 'gemini-3.8-flash',
      category: 'invalid_api_key_or_authentication', status: 401,
      statusText: 'Unauthorized', errorName: 'GoogleGenerativeAIFetchError',
    },
  )
  assert.equal(geminiFailureDiagnostic('chat_response', 'gemini-3.8-flash', { status: 404 }).category, 'model_or_endpoint_not_found')
  assert.equal(geminiFailureDiagnostic('chat_response', 'gemini-3.8-flash', { status: 429 }).category, 'quota_or_rate_limit')
  assert.equal(geminiFailureDiagnostic('generation_probe', 'gemini-3.8-flash', { status: 503, providerStatus: 'UNAVAILABLE' }).category, 'provider_unavailable')
})

test('Gemini timeouts and transport failures are distinguished without raw error text', () => {
  assert.equal(geminiFailureDiagnostic('chat_response', 'gemini-3.8-flash', { name: 'AbortError' }).category, 'request_timeout')
  assert.equal(geminiFailureDiagnostic('chat_response', 'gemini-3.8-flash', { name: 'TypeError', message: 'fetch failed' }).category, 'network_or_runtime_fetch_failure')
})

test('Gemini diagnostics never retain the message, prompt, or key from an error string', () => {
  const diagnostic = geminiFailureDiagnostic('chat_response', 'gemini-3.8-flash', {
    name: 'GoogleGenerativeAIError',
    message: 'request included private prompt and AIzaSecretKeyValue but fetch failed',
  })
  const serialized = JSON.stringify(diagnostic)
  assert.equal(serialized.includes('private prompt'), false)
  assert.equal(serialized.includes('AIzaSecretKeyValue'), false)
  assert.equal(diagnostic.category, 'network_or_runtime_fetch_failure')
})

test('Gemini model probe reports missing credentials without contacting Google', async () => {
  assert.deepEqual(await probeGeminiModel({ GEMINI_MODEL: 'gemini-3.5-flash-lite' }), {
    provider: 'google-gemini', model: 'gemini-3.5-flash-lite', configured: false,
    available: false, category: 'missing_api_key',
  })
})

test('Gemini generation probe reports missing credentials without contacting Google', async () => {
  assert.deepEqual(await probeGeminiGeneration({ GEMINI_MODEL: 'gemini-3.5-flash-lite' }), {
    provider: 'google-gemini', model: 'gemini-3.5-flash-lite', configured: false,
    available: false, category: 'missing_api_key',
  })
})

test('diagnostic probes reject unapproved model overrides', async () => {
  assert.equal((await probeGeminiModel({}, 10_000, 'unexpected-model')).category, 'model_not_allowed')
  assert.equal((await probeGeminiGeneration({}, 20_000, 'unexpected-model')).category, 'model_not_allowed')
})
