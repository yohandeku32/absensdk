import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // Gunakan "/" karena website memakai domain sendiri:
    // absenkuaputu.my.id
    base: '/',

    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // HMR dinonaktifkan di AI Studio melalui DISABLE_HMR.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Nonaktifkan file watching ketika DISABLE_HMR aktif.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});