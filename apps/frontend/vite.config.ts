import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,gif,ico,svg,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 3000000,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      manifest: {
        name: 'LinguaQuiz',
        short_name: 'LinguaQuiz',
        description: 'Advanced language learning with spaced repetition',
        start_url: '/',
        scope: '/',
        theme_color: '#4a90e2',
        background_color: '#f4f7f9',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['education', 'language'],
        icons: [
          {
            src: '/favicon/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_URL || 'http://localhost:9000',
        changeOrigin: true,
      },
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
  preview: { port: 5173, strictPort: true },
  publicDir: 'public',
  build: {
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        banner: '',
        footer: '',
        intro: '',
        outro: '',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-state': ['zustand'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  esbuild: {
    target: 'es2020',
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      '@app': path.resolve('./src/app'),
      '@pages': path.resolve('./src/pages'),
      '@features': path.resolve('./src/features'),
      '@shared': path.resolve('./src/shared'),
      '@api': path.resolve('./src/api'),
      '../../../lingua-quiz-schema.json': path.resolve('../../schema/lingua-quiz-schema.json'),
    },
  },
});
