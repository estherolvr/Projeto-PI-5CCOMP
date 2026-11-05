import { test, expect } from './fixtures'
for (const role of ['student', 'asa', 'admin'] as const) {
  test(`DESIGN-${role} desktop, mobile, navegação e tema`, async ({ session }, info) => {
    test.setTimeout(300_000)
    const page = await session(role)
    const shell = page.locator('.workspace-shell')
    await expect(shell).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.workspace-hero, .student-welcome, .asa-welcome')).toBeVisible()
    await page.screenshot({path: info.outputPath(`${role}-desktop.png`), fullPage: true})
    const links = await shell.locator('aside nav a').evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('href')).filter(Boolean))])
    for (const href of links) {
      await page.goto(href!)
      await expect(shell).toBeVisible()
    await page.waitForLoadState('networkidle')
      await expect(page.locator('main')).not.toBeEmpty()
      if (/conversas|notificacoes|perfil|agendamento/.test(href!)) await page.screenshot({path:info.outputPath(href!.replaceAll('/', '-')+'.png')})
    }
    await page.goto(role === 'student' ? '/aluno' : `/${role}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', {name: 'Modo escuro', exact:true}).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.screenshot({path: info.outputPath(`${role}-dark.png`)})
    await page.getByRole('button', {name: 'Modo claro', exact:true}).click()
    await page.setViewportSize({width:390,height:844})
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({path: info.outputPath(`${role}-mobile.png`)})
    await page.locator('header:visible button').first().click()
    await expect(page.locator('aside:visible')).toBeVisible()
    await page.screenshot({path: info.outputPath(`${role}-mobile-menu.png`)})
  })
}
