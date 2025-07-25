import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/stockbroker': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/policy': 'http://localhost:8000',
      '/organization': 'http://localhost:8000',
      '/data-requests': 'http://localhost:8000',
      '/inter-org-contracts': 'http://localhost:8000',
      '/audit': 'http://localhost:8000',
      '/bank': 'http://localhost:8000',
      '/insurance': 'http://localhost:8000',
      '/websocket': 'http://localhost:8000',
    },
  },
})
