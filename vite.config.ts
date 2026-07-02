import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest so we own src/sw.ts and can add push + notificationclick
      // handlers (generateSW's Workbox output has no hook for these). Task 10.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: { swSrc: 'src/sw.ts', swDest: 'dist/sw.js' },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Baby Tracker',
        short_name: 'Baby',
        description: 'Track feeds, nappies, weight and medication',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
