import { test as base, expect, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import { readFileSync } from 'node:fs'

export type Role = 'student' | 'asa' | 'admin'
const route = { student: 'aluno', asa: 'asa', admin: 'admin' }
const states = new Map<Role, Awaited<ReturnType<BrowserContext['storageState']>>>()
const profiles = new Map<Role, any>()
const baseURL = process.env.E2E_BASE_URL || 'https://alvaro-ai.joao-fsantana.workers.dev'

function safe(text: string) {
  return text.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]+/g, '[email]').replace(/eyJ[\w.-]+/g, '[token]').slice(0, 600)
}

async function state(browser: Browser, role: Role) {
  if (states.has(role)) return states.get(role)!
  const prefix = role.toUpperCase()
  const email = process.env[`E2E_${prefix}_EMAIL`]
  const password = process.env[`E2E_${prefix}_PASSWORD`]
  if (!email || !password) throw new Error(`PRECONDITION: test credentials missing for ${role}`)
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.locator('input[type=email]').fill(email)
    await page.locator('input[type=password]').fill(password)
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    expect((await response).status(), 'Login real deve responder HTTP 200').toBe(200)
    await expect(page).toHaveURL(new RegExp(`/${route[role]}$`), { timeout: 20_000 })
    const me = await api(page, '/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.data.user.role).toBe(route[role])
    profiles.set(role, me.data.user)
    const saved = await context.storageState()
    states.set(role, saved)
    return saved
  } finally { await context.close() }
}

export const test = base.extend<{ session: (role: Role) => Promise<Page> }>({
  session: async ({ browser }, use, info) => {
    const contexts: BrowserContext[] = []
    const pages: Page[] = []
    const logs: any[] = []
    const errors: string[] = []
    try {
      await use(async role => {
        const context = await browser.newContext({ baseURL, storageState: await state(browser, role), viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
        contexts.push(context)
        const page = await context.newPage()
        pages.push(page)
        page.on('pageerror', error => { errors.push(safe(error.message)); logs.push({ role, kind: 'pageerror', message: safe(error.message) }) })
        page.on('console', message => { if (message.type() === 'error') logs.push({ role, kind: 'console', message: safe(message.text()) }) })
        page.on('response', response => {
          const path = new URL(response.url()).pathname
          if (path.startsWith('/api/')) logs.push({ role, kind: 'http', method: response.request().method(), path, status: response.status() })
        })
        page.on('requestfailed', request => logs.push({ role, kind: 'network', path: new URL(request.url()).pathname, error: safe(request.failure()?.errorText || '') }))
        await page.goto(`/${route[role]}`)
        await expect(page.getByText('Validando sessão…')).toHaveCount(0)
        return page
      })
      expect(errors, 'Não devem ocorrer exceções JavaScript no navegador').toEqual([])
    } finally {
      await info.attach('http-console', { body: Buffer.from(JSON.stringify(logs, null, 2)), contentType: 'application/json' })
      if (info.status !== info.expectedStatus) {
        for (const [index, page] of pages.entries()) await evidence(page, info, `failure-${index}`).catch(() => {})
      }
      await Promise.all(contexts.map(context => context.close()))
    }
  },
})
export { expect }
export function profile(role: Role) { return profiles.get(role) }
export async function api(page: Page, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(path, {
      method, headers: { Authorization: `Bearer ${localStorage.getItem('asaia_auth_token') || ''}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = null }
    return { status: response.status, data }
  }, { path, method, body })
}
export function allowWrites() {
  if (process.env.E2E_ALLOW_TEST_WRITES !== '1') throw new Error('PRECONDITION: set E2E_ALLOW_TEST_WRITES=1 to create isolated production test records; no scenario was skipped')
}
export async function evidence(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(name + '.png')
  await page.screenshot({ path, fullPage: false, mask: [page.locator('input,textarea,dd,tbody,[data-private]')] })
  await info.attach(name, { path, contentType: 'image/png' })
}
export async function downloadMatches(page: Page, locator: import('@playwright/test').Locator, expected: Buffer) {
  const pending = page.waitForEvent('download')
  await locator.click()
  const download = await pending
  expect(await download.failure()).toBeNull()
  const path = await download.path()
  expect(Boolean(path)).toBe(true)
  expect(readFileSync(path!).equals(expected), 'Download deve conservar os bytes originais').toBe(true)
}
