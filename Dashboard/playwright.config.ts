import { defineConfig, devices } from 'playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4174',
    launchOptions: { channel: 'msedge' },
    trace: 'retain-on-failure',
  },
})
