import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import '@fontsource-variable/inter/opsz.css';
import './index.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);

// Built pages arrive already rendered (scripts/prerender.mjs), so React picks up that markup instead of
// redrawing it; the dev server sends an empty root and renders from scratch
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);

// Offline support and instant repeat visits. Production only, so the dev server never serves stale files
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
