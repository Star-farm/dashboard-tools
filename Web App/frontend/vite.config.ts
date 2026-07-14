import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/proxy': {
        target: 'http://localhost:8080',
        changeOrigin: true,

        rewrite: (path) =>
          path.replace(/^\/api\/proxy/, '/api'),

        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
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