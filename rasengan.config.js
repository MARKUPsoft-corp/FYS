import { defineConfig } from 'rasengan';
import { rasengan } from 'rasengan/plugin';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { configure } from "@rasenganjs/vercel";

export default defineConfig(async () => {
  return {
    vite: {
      plugins: [
        tailwindcss(),
        rasengan({ adapter: configure() }),
        VitePWA({
          // SW registration is handled manually in src/index.ts
          // because Rasengan generates HTML via writeBundle (post-Vite hooks)
          injectRegister: null,
          registerType: 'autoUpdate',

          // Use the manifest.webmanifest from /public/ as-is
          manifest: false,

          strategies: 'generateSW',

          devOptions: {
            enabled: true,
            type: 'module',
          },

          workbox: {
            maximumFileSizeToCacheInBytes: 5000000, // 5 MB limit
            // Precache all built assets
            globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],

            // SPA fallback for client-side routing
            navigateFallback: 'index.html',
            navigateFallbackDenylist: [/^\/api\//],

            // Aggressive cleanup of old caches
            cleanupOutdatedCaches: true,

            runtimeCaching: [
              // Firebase Firestore / Auth API — network-first (fresh data)
              {
                urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'firebase-api',
                  networkTimeoutSeconds: 5,
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 5 * 60,
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              // Cloudinary images — cache-first
              {
                urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cloudinary-images',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              // Pexels images (hero banners)
              {
                urlPattern: /^https:\/\/images\.pexels\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'pexels-images',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
        }),
      ],
    },
  };
});
