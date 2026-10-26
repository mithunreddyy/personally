import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {feed} from './vite-plugin-feed';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Served from https://mithunreddyy.github.io/Portfolio/ in production
    base: mode === 'production' ? '/Portfolio/' : '/',
    plugins: [react(), tailwindcss(), feed()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
