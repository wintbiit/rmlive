import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('artplayer') || id.includes('hls.js')) {
            return 'player-vendor';
          }

          if (id.includes('primevue') || id.includes('@primeuix') || id.includes('primeicons')) {
            return 'ui-vendor';
          }

          if (id.includes('pinia') || id.includes('/vue/')) {
            return 'core-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
