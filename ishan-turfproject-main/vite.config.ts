import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Register service worker automatically
      registerType: 'autoUpdate',
      // Inline the manifest (also referenced in public/manifest.webmanifest)
      manifest: {
        name: 'Elite Arena',
        short_name: 'Elite Arena',
        description: 'Premium Sports Ground Booking & Management System',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#09090b',
        theme_color: '#16a34a',
        lang: 'en',
        categories: ['business', 'sports', 'productivity'],
        icons: [
          {
            src: '/icon-192.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any',
          },
          {
            src: '/icon-512.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any',
          },
          {
            src: '/icon-512.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Bookings',
            short_name: 'Bookings',
            description: 'View all bookings',
            url: '/admin/bookings',
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Open the dashboard',
            url: '/admin/dashboard',
          },
        ],
      },
      workbox: {
        // ── Caching strategies ────────────────────────────────────────────
        runtimeCaching: [
          // Supabase API — Network first, fall back to cache
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          // Google Fonts — Cache first (CDN, immutable)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
          // App images/icons — Cache first
          {
            urlPattern: /\.(jpg|jpeg|png|svg|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
        // Offline fallback page
        navigateFallback: '/index.html',
        // Exclude auth callback routes from SW interception
        navigateFallbackDenylist: [/^\/admin\/auth\//],
        // Skip waiting — update SW immediately when new version available
        skipWaiting: true,
        clientsClaim: true,
        // Don't cache Supabase tokens in SW cache
        globIgnores: ['**/*.map'],
      },
      // Dev mode SW for testing
      devOptions: {
        enabled: false, // Set true temporarily if you need to test SW locally
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor'
            }
            if (id.includes('@radix-ui') || id.includes('framer-motion')) {
              return 'ui-vendor'
            }
            if (id.includes('recharts')) {
              return 'charts'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query'
            }
            if (id.includes('@supabase')) {
              return 'supabase'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
