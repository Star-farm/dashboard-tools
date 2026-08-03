// Import defineConfig from 'vitest/config' instead of 'vite' 
// to automatically merge Vitest typings with Vite config.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export function createDevelopmentProxyHeaders(apiKey: string | undefined): Record<string, string> {
  const trimmedKey = apiKey?.trim()
  if (!trimmedKey) {
    throw new Error('BACKEND_API_KEY is required when starting the development proxy.')
  }
  return { 'X-API-Key': trimmedKey }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const developmentProxyHeaders = command === 'serve' && mode === 'development'
    ? createDevelopmentProxyHeaders(env.BACKEND_API_KEY)
    : undefined

  return {
    plugins: [react()],
    test: {
      globals: true,             // Allows using describe, it, expect without manual imports
      environment: 'jsdom',      // Simulates browser environment in Node.js
      setupFiles: './src/setupTests.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
        exclude: ['src/setupTests.ts', 'src/types.ts'],
        thresholds: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
    server: {
      proxy: {
        '/api/proxy': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/proxy/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (developmentProxyHeaders) {
                proxyReq.setHeader('X-API-Key', developmentProxyHeaders['X-API-Key'])
              }
            })
          },
        },
      },
    },
  }
})
