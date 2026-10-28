import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const SITE = 'https://mithun.fyi';
const BLOG_DIR = path.resolve(__dirname, 'content/blog');

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Reads only the flat `key: value` lines the blog frontmatter uses
function frontmatter(raw: string): Record<string, string> {
  const block = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const data: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const pair = line.match(/^([A-Za-z][\w-]*):\s*(.+)$/);
    if (!pair) continue;
    const value = pair[2].trim();
    data[pair[1]] = value.startsWith('"') ? JSON.parse(value) : value;
  }
  return data;
}

function buildFeed() {
  // Dates are YYYY-MM-DD, or YYYY-MM-DDTHH:mm in Hyderabad time when several posts share a day
  const published = (date = '') => new Date(date.includes('T') ? `${date}:00+05:30` : `${date}T00:00:00Z`);

  const posts = fs
    .readdirSync(BLOG_DIR)
    .filter(file => file.endsWith('.md'))
    .map((file): Record<string, string> => ({
      ...frontmatter(fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')),
      slug: file.replace(/\.md$/, '').replace(/^\d+-/, ''),
    }))
    .filter(post => post.published !== 'false')
    .sort((a, b) => published(b.date).getTime() - published(a.date).getTime());

  const items = posts
    .map(post => {
      const url = `${SITE}/blog/${post.slug}`;
      return `    <item>
      <title>${escape((post.title ?? '').replace(/\n/g, ' '))}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${published(post.date).toUTCString()}</pubDate>
      <description>${escape((post.excerpt ?? '').replace(/\*\*/g, ''))}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mithun Reddy, writing</title>
    <link>${SITE}/</link>
    <description>Notes on building software, from Mithun Reddy.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
}

/** Serves /feed.xml in dev and writes it into the build, straight from content/blog */
export function feed(): Plugin {
  return {
    name: 'blog-feed',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.endsWith('/feed.xml')) return next();
        res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
        res.end(buildFeed());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'feed.xml', source: buildFeed() });
    },
  };
}
