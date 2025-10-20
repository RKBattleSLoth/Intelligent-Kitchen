import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: process.env.ALLOWED_PREVIEW_HOSTS ? process.env.ALLOWED_PREVIEW_HOSTS.split(',') : ['frontend-production-479c.up.railway.app'],
    port: process.env.PORT ? Number(process.env.PORT) : 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})