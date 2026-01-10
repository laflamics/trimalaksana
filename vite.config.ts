import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: './src',
  base: './', // Relative path untuk Electron file:// protocol
  publicDir: '../public', // Public folder di root project
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Ensure consistent asset paths
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
});

