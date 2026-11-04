import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const output = resolve(__dirname, '../work/qa-adjustments', process.env.E2E_RUN_ID || 'latest')
export default defineConfig({
  testDir: '.', testMatch: '**/*.spec.ts', timeout: 120_000,
  fullyParallel: false, workers: 1, retries: 0,
  reporter: process.argv.includes('--list') ? [['list']] : [
    ['list'], ['json', { outputFile: output + '/results.json' }],
    ['html', { outputFolder: output + '/html', open: 'never' }],
  ],
  outputDir: output + '/artifacts',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://alvaro-ai.joao-fsantana.workers.dev',
    headless: true, viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined,
      args: ['--no-sandbox'],
    },
    trace: 'off', screenshot: 'off', video: 'off', ignoreHTTPSErrors: false,
  },
})
