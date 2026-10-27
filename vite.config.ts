import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {feed} from './vite-plugin-feed';
import {sitemap} from './vite-plugin-sitemap';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Cloudflare serves from the domain root; the GitHub Pages backup (GITHUB_PAGES=true in its workflow) serves from /Portfolio/
    base: mode === 'production' && process.env.GITHUB_PAGES ? '/Portfolio/' : '/',
    plugins: [react(), tailwindcss(), feed(), sitemap()],
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
