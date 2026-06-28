import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      ...(process.env.ANALYZE === 'true' ? {} : { emitFile: false }),
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifestFilename: 'manifest.json',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/minhasaude/, /^\/meus-exames/],
        // Keep SW install light in production: route chunks are fetched on demand.
        globPatterns: ['index.html', 'assets/*.{css,ico,png,svg,webp,jpg,jpeg,woff2}'],
        globIgnores: ['**/*.js', '**/*.map', '**/stats.html'],
        maximumFileSizeToCacheInBytes: 1024 * 1024,
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
  }
})
