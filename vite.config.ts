import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  return {
    base: '/',
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.ts'],
    },

    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          suppressWarnings: true
        },
        manifest: {
          name: 'Kipu',
          short_name: 'Kipu',
          description: 'A tactile, educational, and sensory mini-game suite for children — inspired by the Andean khipu.',
          theme_color: '#3D2B1F',
          background_color: '#F5EDD8',
          display: 'fullscreen',
          orientation: 'portrait',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        }
      })
    ]
  };
});
