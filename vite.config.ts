import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:4000',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'images/autocare/providers/*.webp',
        'images/autocare/placeholders/*.svg',
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        // The prompt flow calls skipWaiting; claim the open tab so its
        // controllerchange listener can reload the latest application shell.
        clientsClaim: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Workbox serializes this matcher into sw.js; keep it self-contained.
            urlPattern: ({ url, request }) => {
              const publicProviderDetailPath = /^\/api\/v1\/providers\/[^/]+$/i
              const legacyCabinetDetailPath = /^\/api\/cabinets\/(?:cabinet-[^/]+|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

              if (
                request.method.toUpperCase() !== 'GET' ||
                request.headers.has('authorization')
              ) {
                return false
              }

              return url.pathname === '/api/v1/discovery/providers'
                || publicProviderDetailPath.test(url.pathname)
                || url.pathname === '/api/cabinets'
                || legacyCabinetDetailPath.test(url.pathname)
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'autocare-hub-public-providers',
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 5 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'AutoCare Hub',
        short_name: 'AutoCare Hub',
        description: 'Compare automotive services, request estimates, and book visits',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20_000,
          groups: [
            {
              name: 'react-runtime',
              test: /node_modules[\\/]react(?:-dom|-router)?[\\/]/,
              priority: 3,
            },
            {
              name: 'state-runtime',
              test: /node_modules[\\/](?:@reduxjs|react-redux)[\\/]/,
              priority: 2,
            },
            {
              name: 'i18n-runtime',
              test: /src[\\/]shared[\\/]config[\\/]translations[\\/]/,
              maxSize: 250_000,
              priority: 2,
            },
            {
              name: 'ui-runtime',
              test: /node_modules[\\/](?:@base-ui|framer-motion|lucide-react)[\\/]/,
              priority: 2,
            },
            {
              name: 'vendor-runtime',
              test: /node_modules[\\/]/,
              maxSize: 250_000,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
