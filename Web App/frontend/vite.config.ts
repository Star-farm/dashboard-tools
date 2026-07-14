// Import defineConfig from 'vitest/config' instead of 'vite' 
// to automatically merge Vitest typings with Vite config.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,             // Allows using describe, it, expect without manual imports
    environment: 'jsdom',      // Simulates browser environment in Node.js
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
            // Automatically attaches the test API key to all proxy requests during development
            proxyReq.setHeader(
              'X-API-Key',
              'test-key-123'
            );
          });
        },
      },
    },
  },
});