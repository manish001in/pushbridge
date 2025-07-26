import { resolve } from 'path';

import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
        options: resolve(__dirname, 'src/options/options.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    target: 'es2022',
    minify: mode === 'production',
    sourcemap: mode !== 'production',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode || 'development'),
  },
  esbuild: {
    // Keep console logs for debugging - only drop debugger statements in production
    drop: mode === 'production' ? ['debugger'] : [],
  },
}));
