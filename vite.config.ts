import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';
  const isBuildIFrame = process.env.VITE_BUILD_IFRAME === 'true' || mode === 'iframe';

  if (isBuildIFrame) {
    // Build iframe-inject.js as a standalone IIFE
    return {
      plugins: [],
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
      build: {
        lib: {
          entry: path.resolve(__dirname, './src/iframe-inject.ts'),
          name: 'RmLiveInjector',
          formats: ['iife'],
        },
        outDir: 'dist',
        rollupOptions: {
          output: {
            entryFileNames: 'iframe-inject.js',
          },
        },
        minify: 'terser',
      },
    };
  }

  // Main application build configuration
  return {
    base: process.env.VITE_BASE ?? '/',
    plugins: [
      vue(),
      isAnalyze
        ? visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            open: false,
          })
        : null,
    ].filter(Boolean),
    server: {
      proxy: {
        '/live_json': {
          target: 'https://rm-static.djicdn.com/',
          changeOrigin: true,
          rewrite: (path) => {
            return path;
          },
        },
        '/rm-static': {
          target: 'https://rm-static.djicdn.com/',
          changeOrigin: true,
          rewrite: (path) => {
            return path.replace(/^\/rm-static\//, '');
          },
        },
      },
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('hls.js')) {
              return 'player-hls';
            }

            if (id.includes('artplayer') || id.includes('artplayer-plugin-danmuku')) {
              return 'player-art';
            }

            if (
              id.includes('primevue/datatable') ||
              id.includes('primevue/column') ||
              id.includes('primevue/paginator')
            ) {
              return 'ui-table';
            }

            if (id.includes('primevue/')) {
              return 'ui-components';
            }

            if (id.includes('@primeuix')) {
              return 'ui-theme';
            }

            if (id.includes('primeicons')) {
              return 'ui-icons';
            }

            if (id.includes('pinia') || id.includes('/vue/')) {
              return 'core-vendor';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
