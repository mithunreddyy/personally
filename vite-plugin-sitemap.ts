import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const SITE = 'https://mithunre.vercel.app';
const BLOG_DIR = path.resolve(__dirname, 'content/blog');
const PROJECTS_DIR = path.resolve(__dirname, 'content/projects');

function slugOf(file: string) {
  return file.replace(/\.md$/, '').replace(/^\d+-/, '');
}

function slugsFrom(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(slugOf);
  } catch {
    return [];
  }
}

function buildSitemap(): string {
  const staticRoutes = ['/', '/cv'];
  const blogSlugs = slugsFrom(BLOG_DIR).map(s => `/blog/${s}`);
  const projectSlugs = slugsFrom(PROJECTS_DIR).map(s => `/work/${s}`);
  const allRoutes = [...staticRoutes, ...projectSlugs, ...blogSlugs];
  const today = new Date().toISOString().slice(0, 10);

  const urls = allRoutes
    .map(
      route => `  <url>
    <loc>${SITE}${route}</loc>
    <lastmod>${today}</lastmod>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** Serves /sitemap.xml in dev and writes it into the production build */
export function sitemap(): Plugin {
  return {
    name: 'portfolio-sitemap',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.endsWith('/sitemap.xml')) return next();
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end(buildSitemap());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap() });
    },
  };
}
