import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173/schema-llama/', viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--use-angle=metal'] } },
  webServer: { command: 'npx vite --port 5173', url: 'http://localhost:5173/schema-llama/', reuseExistingServer: true },
})
