import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/maps': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  }
})
