import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isNodeModule = (id: string, packageName: string) =>
  id.includes(`/node_modules/${packageName}/`) ||
  id.includes(`\\node_modules\\${packageName}\\`)

const vendorChunkFor = (id: string) => {
  if (!id.includes('node_modules')) return undefined

  if (
    isNodeModule(id, 'react') ||
    isNodeModule(id, 'react-dom') ||
    isNodeModule(id, 'scheduler')
  ) {
    return 'vendor-react'
  }

  if (
    isNodeModule(id, 'react-router') ||
    isNodeModule(id, 'react-router-dom') ||
    isNodeModule(id, '@remix-run/router')
  ) {
    return 'vendor-router'
  }

  if (
    isNodeModule(id, 'recharts') ||
    isNodeModule(id, 'd3-array') ||
    isNodeModule(id, 'd3-color') ||
    isNodeModule(id, 'd3-format') ||
    isNodeModule(id, 'd3-interpolate') ||
    isNodeModule(id, 'd3-scale') ||
    isNodeModule(id, 'd3-shape') ||
    isNodeModule(id, 'd3-time') ||
    isNodeModule(id, 'd3-time-format') ||
    isNodeModule(id, 'victory-vendor')
  ) {
    return 'vendor-charts'
  }

  if (
    isNodeModule(id, 'jspdf') ||
    isNodeModule(id, 'jspdf-autotable') ||
    isNodeModule(id, 'html2canvas') ||
    isNodeModule(id, 'dompurify')
  ) {
    return 'vendor-pdf'
  }

  if (
    isNodeModule(id, 'framer-motion') ||
    isNodeModule(id, 'lottie-react') ||
    isNodeModule(id, 'vaul')
  ) {
    return 'vendor-motion'
  }

  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifestFilename: 'manifest.json',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, url, sameOrigin }) =>
              request.destination === 'image' &&
              (sameOrigin ||
                url.hostname === 'janocaminho.com.br' ||
                url.hostname === 'www.janocaminho.com.br' ||
                url.hostname.endsWith('.amazonaws.com') ||
                url.hostname.endsWith('.cloudfront.net')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'jnc-public-images-v1',
              expiration: {
                maxEntries: 320,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'robots.txt', 'janocaminho.jpg'],
      manifest: {
        short_name: 'Já no Caminho',
        name: 'Já no Caminho - Plataforma de Pedidos e Gestão',
        description:
          'Plataforma completa para pedidos online, operação e entregas de restaurantes, mercados, farmácias e adegas.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2F9DF7',
        background_color: '#ffffff',
        lang: 'pt-BR',
        categories: ['food', 'business', 'productivity'],
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/maps': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunkFor,
      },
    },
  }
})
