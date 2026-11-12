import { PassThrough } from 'node:stream';
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { HelmetProvider } from 'react-helmet-async';
import { StaticRouter } from 'react-router';

import { Site } from './App';
import { SITE_DESCRIPTION, SITE_URL } from './components/SEO';
import { BLOG_POSTS, PERSONAL_INFO, PROJECTS } from './constants';

/** Every page the site has, in the paths the browser router uses */
export function routes(): string[] {
  return [
    '/',
    '/cv',
    ...PROJECTS.map(project => `/work/${project.id}`),
    ...BLOG_POSTS.map(post => `/blog/${post.slug}`),
  ];
}

/** Renders one route to HTML, waiting for its lazy chunks so the page is complete, not a loading state */
export async function render(url: string, basename: string): Promise<string> {
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <HelmetProvider>
        <Site router={children => <StaticRouter location={url} basename={basename}>{children}</StaticRouter>} />
      </HelmetProvider>
    </StrictMode>,
  );
  const chunks: Buffer[] = [];
  for await (const chunk of prelude.pipe(new PassThrough())) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

/** /llms.txt: a plain map of the site for language models, built from the same content as the pages */
export function llmsTxt(): string {
  const line = (title: string, path: string, note: string) => `- [${title}](${SITE_URL}${path}): ${note.replace(/\s+/g, ' ').trim()}`;
  return [
    `# ${PERSONAL_INFO.name}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    '## Pages',
    '',
    line('Home', '/', 'introduction, projects, writing, and how to get in touch'),
    line('CV', '/cv', `${PERSONAL_INFO.role}: experience, education, and stack`),
    '',
    '## Projects',
    '',
    ...PROJECTS.map(project => line(project.title, `/work/${project.id}`, project.summary)),
    '',
    '## Writing',
    '',
    ...BLOG_POSTS.map(post => line(post.title.replace(/\n/g, ' '), `/blog/${post.slug}`, post.excerpt)),
    '',
    '## Elsewhere',
    '',
    `- [GitHub](https://github.com/${PERSONAL_INFO.github})`,
    `- [LinkedIn](https://www.linkedin.com/in/${PERSONAL_INFO.linkedin})`,
    `- [RSS feed](${SITE_URL}/feed.xml)`,
    '',
  ].join('\n');
}
