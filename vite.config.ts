import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({

  plugins: [

    react(),

    VitePWA({

      registerType: 'autoUpdate',

      injectRegister: 'auto',

      includeAssets: [

        'favicon.svg',
        'apple-touch-icon.png',
        'masked-icon.svg',
      ],

      manifest: {

        name: 'Supremi Advisor',

        short_name:
          'Supremi',

        description:
          'App collaborativa ferroviaria Trenord',

        theme_color:
          '#009B77',

        background_color:
          '#f3f4f6',

        display:
          'standalone',

        orientation:
          'portrait',

        scope: '/',

        start_url: '/',

        icons: [

          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },

          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },

          {
            src: '/pwa-512x512.png',
            sizes:
              '512x512',
            type: 'image/png',
            purpose:
              'any maskable',
          },
        ],
      },

      workbox: {

        globPatterns: [
          '**/*.{js,css,html,png,svg,ico}',
        ],

        cleanupOutdatedCaches:
          true,

        clientsClaim: true,

        skipWaiting: true,
      },

      devOptions: {

        enabled: true,
      },
    }),
  ],

  optimizeDeps: {

    exclude: [
      'lucide-react',
    ],
  },
});