import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
        theme_color: '#007A3D',
        background_color: '#1F2937',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMDgiIGZpbGw9IiMxRjI5MzciLz4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNTYsMjU4KSBzY2FsZSgxLjYyKSI+CiAgICA8Zz4KICAgICAgPGxpbmUgeDE9Ii0xNyIgeTE9Ii04MCIgeDI9Ii0xNyIgeTI9Ii0yMDUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iMTciIHkxPSItODAiIHgyPSIxNyIgeTI9Ii0yMDUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iLTI4IiB5MT0iLTEwMCIgeDI9IjI4IiB5Mj0iLTEwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICAgIDxsaW5lIHgxPSItMjgiIHkxPSItMTMwIiB4Mj0iMjgiIHkyPSItMTMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgICAgPGxpbmUgeDE9Ii0yOCIgeTE9Ii0xNjAiIHgyPSIyOCIgeTI9Ii0xNjAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iLTI4IiB5MT0iLTE5MCIgeDI9IjI4IiB5Mj0iLTE5MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8L2c+CiAgICA8ZyB0cmFuc2Zvcm09InJvdGF0ZSgxMjApIj4KICAgICAgPGxpbmUgeDE9Ii0xNyIgeTE9Ii04MCIgeDI9Ii0xNyIgeTI9Ii0yMDUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iMTciIHkxPSItODAiIHgyPSIxNyIgeTI9Ii0yMDUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iLTI4IiB5MT0iLTEwMCIgeDI9IjI4IiB5Mj0iLTEwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICAgIDxsaW5lIHgxPSItMjgiIHkxPSItMTMwIiB4Mj0iMjgiIHkyPSItMTMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgICAgPGxpbmUgeDE9Ii0yOCIgeTE9Ii0xNjAiIHgyPSIyOCIgeTI9Ii0xNjAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iLTI4IiB5MT0iLTE5MCIgeDI9IjI4IiB5Mj0iLTE5MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8L2c+CiAgICA8ZyB0cmFuc2Zvcm09InJvdGF0ZSgyNDApIj4KICAgICAgPGxpbmUgeDE9Ii0xNyIgeTE9Ii04MCIgeDI9Ii0xNyIgeTI9Ii0yMDUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iMTciIHkxPSItODAiIHgyPSIxNyIgeTI9Ii0yMDUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iLTI4IiB5MT0iLTEwMCIgeDI9IjI4IiB5Mj0iLTEwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICAgIDxsaW5lIHgxPSItMjgiIHkxPSItMTMwIiB4Mj0iMjgiIHkyPSItMTMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgICAgPGxpbmUgeDE9Ii0yOCIgeTE9Ii0xNjAiIHgyPSIyOCIgeTI9Ii0xNjAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgICA8bGluZSB4MT0iLTI4IiB5MT0iLTE5MCIgeDI9IjI4IiB5Mj0iLTE5MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8L2c+CiAgICA8Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iNzgiIGZpbGw9IndoaXRlIi8+CiAgICA8Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iNzAiIGZpbGw9IiMwMDdBM0QiLz4KICAgIDxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSI0OCIgZmlsbD0id2hpdGUiLz4KICAgIDxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIyOCIgZmlsbD0iIzAwN0EzRCIvPgogIDwvZz4KPC9zdmc+',
            sizes: 'any',
            type: 'image/svg+xml',
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