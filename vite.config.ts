import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      injectRegister: 'auto',

      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
      ],

      manifest: {
        name: 'Supremi Advisor',

        short_name: 'Supremi Advisor',

        description:
          'Servizi e informazioni per il personale ferroviario',

        theme_color: '#007A3D',

        background_color: '#1F2937',

        display: 'standalone',

        orientation: 'portrait',

        scope: '/',

        start_url: '/',

        icons: [
          {
            src: '/apple-touch-icon.png',

            sizes: '512x512',

            type: 'image/png',

            purpose: 'any',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico}',
        ],

        cleanupOutdatedCaches: true,

        clientsClaim: true,

        skipWaiting: true,
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});