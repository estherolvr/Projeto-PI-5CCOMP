import { test, expect, type Page } from '@playwright/test'

type Profile = 'student' | 'asa' | 'admin'
const credentials: Record<Profile, { email?: string; password?: string }> = {
  student: { email: process.env.E2E_STUDENT_EMAIL, password: process.env.E2E_STUDENT_PASSWORD },
  asa: { email: process.env.E2E_ASA_EMAIL, password: process.env.E2E_ASA_PASSWORD },
  admin: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
}

const paths: Record<Profile, string[]> = {
  student: ['/aluno', '/aluno/chat', '/aluno/chamados', '/aluno/chamados/novo', '/aluno/documentos', '/aluno/agendamento', '/aluno/perfil'],
  asa: ['/asa', '/asa/agendamentos', '/asa/chamados', '/asa/conversas', '/asa/alunos', '/asa/agente-ia', '/asa/base-conhecimento', '/asa/sla', '/asa/metricas', '/asa/relatorios', '/asa/notificacoes', '/asa/auditoria'],
  admin: ['/admin', '/admin/chamados', '/admin/fila', '/admin/agendamentos', '/admin/sla', '/admin/categorias', '/admin/automacoes', '/admin/agente-ia', '/admin/prompts', '/admin/base-conhecimento', '/admin/rag', '/admin/feedback', '/admin/usuarios', '/admin/alunos', '/admin/asa', '/admin/permissoes', '/admin/integracoes', '/admin/metricas', '/admin/relatorios', '/admin/auditoria', '/admin/logs', '/admin/seguranca', '/admin/configuracoes', '/admin/saude'],
}

async function signIn(page: Page, profile: Profile) {
  const { email, password } = credentials[profile]
  if (!email || !password) {
    throw new Error(`Credenciais E2E do perfil ${profile} não configuradas; o fluxo não foi executado.`)
  }
  await page.goto('/login')
  await page.getByPlaceholder('seu@aluno.fecap.br').fill(email!)
  await page.getByPlaceholder('••••••••').fill(password!)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(new RegExp(`/${profile === 'student' ? 'aluno' : profile}`), { timeout: 20_000 })
}

test('página pública e formulário de login carregam; campos são obrigatórios', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('body')).not.toBeEmpty()
  await page.goto('/login')
  const email = page.getByPlaceholder('seu@aluno.fecap.br')
  const password = page.getByPlaceholder('••••••••')
  await expect(email).toBeVisible()
  await expect(password).toBeVisible()
  await expect(email).toHaveAttribute('required', '')
  await expect(password).toHaveAttribute('required', '')
  expect(errors, 'erros JavaScript durante navegação pública').toEqual([])
  const screenshot = test.info().outputPath('login-publico.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  await test.info().attach('login-publico', { path: screenshot, contentType: 'image/png' })
})

test('acesso direto sem sessão a áreas privadas volta para o login', async ({ page }) => {
  for (const path of ['/aluno', '/asa', '/admin', '/admin/usuarios']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByPlaceholder('seu@aluno.fecap.br')).toBeVisible()
  }
})

for (const profile of ['student', 'asa', 'admin'] as const) {
  test.describe(`perfil ${profile}`, () => {
    test('autentica e percorre as páginas mapeadas sem crash de frontend', async ({ page }) => {
      const pageErrors: string[] = []
      const failedResponses: string[] = []
      page.on('pageerror', error => pageErrors.push(error.message))
      page.on('response', response => {
        if (response.status() >= 500) failedResponses.push(`${response.status()} ${response.url()}`)
      })
      await signIn(page, profile)
      for (const path of paths[profile]) {
        await page.goto(path)
        await expect(page.locator('body')).not.toBeEmpty()
        await expect(page.getByText('Validando sessão…')).toHaveCount(0)
      }
      expect(pageErrors, 'erros JavaScript no perfil').toEqual([])
      expect(failedResponses, 'respostas HTTP 5xx nas páginas do perfil').toEqual([])
    })

    test('bloqueia acesso direto a módulos de outros perfis', async ({ page }) => {
      await signIn(page, profile)
      const forbidden = profile === 'student' ? ['/asa', '/admin']
        : profile === 'asa' ? ['/aluno', '/admin'] : ['/aluno', '/asa']
      const home = profile === 'student' ? '/aluno' : `/${profile}`
      for (const path of forbidden) {
        await page.goto(path)
        await expect(page).toHaveURL(new RegExp(`${home.replace('/', '\\/')}(?:$|\\/)`))
      }
    })

    test('menu do perfil aponta somente para rotas do próprio ambiente', async ({ page }) => {
      await signIn(page, profile)
      const prefixes = ['/aluno', '/asa', '/admin']
      const ownPrefix = profile === 'student' ? '/aluno' : `/${profile}`
      const links = await page.getByRole('navigation').first().locator('a[href^="/"]').evaluateAll(nodes =>
        nodes.map(node => (node as HTMLAnchorElement).getAttribute('href') || '')
      )
      expect(links.length, 'o menu deve conter links navegáveis').toBeGreaterThan(0)
      for (const href of links) {
        const profilePrefix = prefixes.find(prefix => href === prefix || href.startsWith(`${prefix}/`))
        if (profilePrefix) expect(profilePrefix, `link cruzado no menu: ${href}`).toBe(ownPrefix)
      }
    })

    test('RBAC da API e escopo entre alunos', async ({ page }) => {
      await signIn(page, profile)
      const results = await page.evaluate(async (role) => {
        const token = localStorage.getItem('asaia_auth_token')
        const headers = { Authorization: `Bearer ${token}` }
        const paths = role === 'student'
          ? ['/api/students', '/api/admin/integrations', '/api/students/00000000-0000-4000-8000-000000000000']
          : role === 'asa'
            ? ['/api/admin/integrations']
            : ['/api/admin/integrations', '/api/students']
        const responses = await Promise.all(paths.map(async path => {
          const response = await fetch(path, { headers })
          return { path, status: response.status }
        }))
        return responses
      }, profile)
      if (profile === 'student') {
        expect(results.map(result => result.status)).toEqual([403, 403, 403])
      } else if (profile === 'asa') {
        expect(results.map(result => result.status)).toEqual([403])
      } else {
        expect(results.map(result => result.status)).toEqual([200, 200])
      }
    })
  })
}

test('integração Gemini está configurada no Worker publicado', async ({ page }) => {
  await signIn(page, 'asa')
  const health = await page.evaluate(async () => {
    const token = localStorage.getItem('asaia_auth_token')
    const response = await fetch('/api/admin/health', { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) return { status: response.status, gemini: 'health-endpoint-failed' }
    const payload = await response.json()
    const gemini = payload.checks?.find((check: { id: string }) => check.id === 'gemini')
    return { status: response.status, gemini: gemini?.status || 'missing' }
  })
  expect(health.status).toBe(200)
  expect(health.gemini).toBe('configurado')
})

test('logout seguido de login de outro perfil não conserva o ambiente anterior', async ({ page }) => {
  await signIn(page, 'student')
  await page.getByRole('button', { name: /sair|encerrar sessão/i }).last().click()
  await expect(page).toHaveURL(/\/login$/)
  await signIn(page, 'admin')
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
  await page.goto('/aluno')
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
})
