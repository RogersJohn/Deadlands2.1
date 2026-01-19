import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/contracts': resolve(__dirname, './src/contracts'),
      '@/api': resolve(__dirname, './src/api'),
      '@/components': resolve(__dirname, './src/components'),
    },
  },
});
