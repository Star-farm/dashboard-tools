import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import deployment from './vercel.json' with { type: 'json' }
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'



const securityHeaders = Object.fromEntries(
  deployment.headers.find((rule) => rule.source === '/(.*)')!.headers.map(({ key, value }) => [key, value]),
)

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'exclude-soil-build-input',
    apply: 'build',
    async writeBundle(output) {

      if (output.dir) await rm(resolve(output.dir, 'map-data/soil-overlay.json'), { force: true })
    },
  }],
  preview: { headers: securityHeaders },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: './tests/setup.ts',
  },
})
