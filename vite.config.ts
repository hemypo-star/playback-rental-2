
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => {
          // Route API calls to our src/api handlers
          if (path.startsWith('/api/categories')) {
            return '/src/api/categories/index.ts';
          }
          if (path.startsWith('/api/products')) {
            return '/src/api/products/index.ts';
          }
          if (path.startsWith('/api/bookings')) {
            return '/src/api/bookings/index.ts';
          }
          return path;
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
}))
