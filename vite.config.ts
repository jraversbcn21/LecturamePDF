import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' sin manejar onNeedRefresh: el worker nuevo espera a que se cierren todas las
      // pestañas y toma el mando en el siguiente arranque. Nunca corta una lectura a medias.
      registerType: 'prompt',
      manifest: {
        name: 'LecturamePDF',
        short_name: 'Lecturame',
        description: 'Escucha tus PDFs con el texto resaltado',
        lang: 'es',
        display: 'standalone',
        theme_color: '#faf7f1',
        background_color: '#faf7f1',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // El worker de pdf.js sale como .mjs y el patrón por defecto no lo incluye: sin él la app
        // arranca sin red pero no extrae nada.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png}'],
        // El fallback de navegación sirve index.html a lo que no esté en caché; una petición a
        // la API sin red debe fallar, no recibir HTML donde se esperaba JSON.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
