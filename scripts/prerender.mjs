// Renders every route to its own HTML file with its own head tags, so crawlers and link previews need no
// JavaScript; then writes /llms.txt and the service worker. Runs after both Vite builds (package.json)
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssrDir = join(root, '.ssr');
// Same switch as vite.config.ts: the GitHub Pages backup lives under /Portfolio/
const base = process.env.GITHUB_PAGES ? '/Portfolio/' : '/';

const { render, routes, llmsTxt } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
const template = readFileSync(join(dist, 'index.html'), 'utf8');

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [relative(dist, path).split('\\').join('/')];
  });
}

// The one font file the first paint needs: Inter's Latin subset. Preloading it starts the download
// alongside the CSS instead of after it
const interLatin = walk(dist).find(file => /^assets\/inter-latin-opsz-normal-[\w-]+\.woff2$/.test(file));
if (!interLatin) throw new Error('prerender: Inter Latin font not found in dist/assets');
const fontPreload = `<link rel="preload" href="${base}${interLatin}" as="font" type="font/woff2" crossorigin />`;

// React 19 renders a page's <title>, <meta> and <link> tags first; they belong in <head>
const HOISTED = /^(?:<title>[^<]*<\/title>|<meta [^>]*\/>|<link [^>]*\/>)+/;

async function page(route) {
  const url = route === '/' ? base : `${base}${route.slice(1)}`;
  const html = await render(url, base);
  const head = html.match(HOISTED)?.[0] ?? '';
  const body = html.slice(head.length);
  if (!head.includes('<title>')) throw new Error(`prerender: ${route} rendered no <title>`);
  return template
    .replace('</head>', `    ${fontPreload}\n    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

// /cv becomes dist/cv.html: Cloudflare and GitHub Pages both serve it at /cv, with no trailing slash,
// which is the URL the canonical tags and sitemap use
const written = [];
for (const route of routes()) {
  const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
  mkdirSync(dirname(join(dist, file)), { recursive: true });
  writeFileSync(join(dist, file), await page(route));
  written.push(route);
}
// Any path that matches no page renders NotFound; Cloudflare serves this file with a real 404 status
writeFileSync(join(dist, '404.html'), await page('/404'));

writeFileSync(join(dist, 'llms.txt'), llmsTxt());

// Service worker: the pages, the app code and styles, the first-paint font and the icons are cached up
// front, so the site opens offline after one visit. Everything else is cached the first time it is used
const files = walk(dist);
const precache = [
  ...written.map(route => (route === '/' ? base : `${base}${route.slice(1)}`)),
  ...files
    .filter(file => /^assets\/.+\.(js|css)$/.test(file) || file === interLatin)
    .map(file => `${base}${file}`),
  ...['manifest.json', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].map(file => `${base}${file}`),
];
// The cache name changes whenever any built file changes, so a deploy replaces the old cache in one go
const hash = createHash('sha256');
for (const file of files.filter(file => file !== 'sw.js').sort()) hash.update(file).update(readFileSync(join(dist, file)));
const version = hash.digest('hex').slice(0, 12);

const sw = readFileSync(join(root, 'scripts', 'sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__BASE__', base)
  .replace('[/* __PRECACHE__ */]', JSON.stringify(precache, null, 2));
writeFileSync(join(dist, 'sw.js'), sw);

rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerender: ${written.length} pages + 404, llms.txt, sw.js (${precache.length} precached, cache ${version})`);
