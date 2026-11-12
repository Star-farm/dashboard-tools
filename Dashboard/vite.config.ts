import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import deployment from './vercel.json' with { type: 'json' }
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

// Exercise the production policy in local preview too. Vite's development
// server needs its own inline styles and HMR, so the CSP is preview-only.
const securityHeaders = Object.fromEntries(
  deployment.headers.find((rule) => rule.source === '/(.*)')!.headers.map(({ key, value }) => [key, value]),
)

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'exclude-soil-build-input',
    apply: 'build',
    async writeBundle(output) {
      // The browser uses the separate soil layers; the full overlay is a build input.
      if (output.dir) await rm(resolve(output.dir, 'map-data/soil-overlay.json'), { force: true })
    },
  }],
  preview: { headers: securityHeaders },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
