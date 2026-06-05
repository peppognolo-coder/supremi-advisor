import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const ICON_192 = 'https://raw.githubusercontent.com/peppognolo-coder/supremi-advisor/main/apple-touch-icon.png';
const ICON_512 = 'https://raw.githubusercontent.com/peppognolo-coder/supremi-advisor/main/icon-512x512.png';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Supremi Advisor',
        short_name: 'Supremi Advisor',
        description: 'Servizi e informazioni per il personale ferroviario',
        theme_color: '#1a5c38',
        background_color: '#1a5c38',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: ICON_192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: ICON_512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
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
