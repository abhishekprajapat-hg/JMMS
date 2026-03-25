import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:4000'

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router')) return 'router'
              return 'vendor'
            }

            if (
              id.includes('/src/services/panchangService') ||
              id.includes('/src/data/jainCalendarData') ||
              id.includes('/src/data/january2026Exact') ||
              id.includes('/src/data/jainKalyanakData') ||
              id.includes('/src/data/jainFestivalHighlights')
            ) {
              return 'calendar-data'
            }

            return undefined
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/receipts': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
