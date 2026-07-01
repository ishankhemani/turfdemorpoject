import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
