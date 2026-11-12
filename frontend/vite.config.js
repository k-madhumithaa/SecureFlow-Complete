import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/backend': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
      '/prometheus': {
        target: 'http://127.0.0.1:9090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prometheus/, ''),
      },
    },
  },
})
