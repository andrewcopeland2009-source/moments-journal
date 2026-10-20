import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Set BASE_PATH when hosting from a sub-path, e.g. GitHub Pages: BASE_PATH=/moments-journal/
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'splash/*.png'],
      manifest: {
        name: 'Moments',
        short_name: 'Moments',
        description: 'A little piece of every day.',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F1E8',
        theme_color: '#F6F1E8',
        categories: ['lifestyle', 'photo'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell and the latin font subsets; other subsets are cached on first use.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', '**/*-latin-[0-9w]*.woff2'],
        globIgnores: ['**/splash/**'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: { cacheName: 'moments-fonts', expiration: { maxEntries: 60 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/splash/'),
            handler: 'CacheFirst',
            options: { cacheName: 'moments-splash', expiration: { maxEntries: 40 } },
          },
        ],
      },
    }),
  ],
});
