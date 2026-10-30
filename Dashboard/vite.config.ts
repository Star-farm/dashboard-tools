import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import deployment from './vercel.json' with { type: 'json' }

// Exercise the production policy in local preview too. Vite's development
// server needs its own inline styles and HMR, so the CSP is preview-only.
const securityHeaders = Object.fromEntries(
  deployment.headers.find((rule) => rule.source === '/(.*)')!.headers.map(({ key, value }) => [key, value]),
)

export default defineConfig({
  base: './',
  plugins: [react()],
  preview: { headers: securityHeaders },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
