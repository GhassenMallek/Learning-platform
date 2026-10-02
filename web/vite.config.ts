import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const BRAND = '#4258e8'; // brand-600

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": a new version installs in the background and waits; the page reloads only when the user taps
      // "Reload" (src/components/PwaUpdater.tsx), so an admin never loses a half-filled form to an update.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'Meridian Learning Center',
        short_name: 'Meridian',
        description: 'Des formations pratiques en technologie, programmation, comptabilité et compétences professionnelles.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: BRAND,
        background_color: '#ffffff',
        categories: ['education'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Mon espace', short_name: 'Mon espace', url: '/student', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Formations', short_name: 'Formations', url: '/courses', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        // The app shell, every route chunk (public, admin, student), CSS, fonts and icons: the app opens offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        // EN/FR only need the latin subsets; the browser still fetches other subsets on demand (unicode-range).
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: '/index.html',
        // API calls and uploaded files are real server paths, never the SPA shell.
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Course covers and avatars: random, immutable file names, so a cached copy is always correct.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/uploads\/(thumbnails|avatars|misc)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 }, cacheableResponse: { statuses: [200] } },
          },
          // Deliberately not cached: /api (personal, permission-checked data — nothing private is left on a
          // shared device) and /uploads/documents (lesson files for enrolled students only, up to 50 MB each).
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Same-origin in dev so the httpOnly auth cookie "just works" (no CORS, no third-party cookie issues).
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
      '/uploads': { target: apiTarget, changeOrigin: false },
    },
  },
  build: { chunkSizeWarningLimit: 900 },
});
