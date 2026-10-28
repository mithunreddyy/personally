import { BlogPost, CvSection, Experience, PersonalInfo, Project, SkillGroup } from '../types';
import { calculateReadTime, parsePostDate } from './utils';

type Frontmatter = Record<string, string | number | boolean | string[]>;

const files = (glob: Record<string, string>) =>
  Object.entries(glob)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, raw]) => ({ path, ...parseMarkdown(raw) }));

const slugOf = (path: string) =>
  path.split('/').pop()!.replace(/\.md$/, '').replace(/^\d+-/, '');

function scalar(raw: string): string | number | boolean {
  const v = raw.trim();
  if (v.startsWith('"') && v.endsWith('"')) return JSON.parse(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && !isNaN(Number(v))) return Number(v);
  return v;
}

/** Splits a file into `key: value` frontmatter (with `- item` lists) and a body. */
function parseMarkdown(raw: string): { data: Frontmatter; body: string } {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data: Frontmatter = {};
  let listKey: string | null = null;
  for (const line of match[1].split('\n')) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      (data[listKey] as string[]).push(String(scalar(item[1])));
      continue;
    }
    const pair = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!pair) continue;
    if (pair[2] === '') {
      listKey = pair[1];
      data[listKey] = [];
    } else {
      listKey = null;
      data[pair[1]] = scalar(pair[2]);
    }
  }
  return { data, body: match[2].trim() };
}

const bulletsOf = (body: string) =>
  body
    .split('\n')
    .map(l => l.match(/^-\s+(.*)$/)?.[1])
    .filter((l): l is string => Boolean(l));

const str = (v: Frontmatter[string] | undefined, fallback = '') =>
  typeof v === 'string' ? v : fallback;

// Root-relative paths in content point into public/, so they need the deploy base prefix
const asset = (path: string) =>
  path.startsWith('/') ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path;

const profile = files(import.meta.glob('/content/profile.md', { query: '?raw', import: 'default', eager: true }))[0];

export const PERSONAL_INFO: PersonalInfo = {
  name: str(profile.data.name),
  role: str(profile.data.role),
  location: str(profile.data.location),
  email: str(profile.data.email),
  github: str(profile.data.github),
  linkedin: str(profile.data.linkedin),
  birthYear: Number(profile.data.birthYear),
  resumeUrl: asset(str(profile.data.resumeUrl)),
  summary: profile.body,
};

export const EXPERIENCES: Experience[] = files(
  import.meta.glob('/content/experience/*.md', { query: '?raw', import: 'default', eager: true }),
).map(({ path, data, body }) => ({
  id: slugOf(path),
  role: str(data.role),
  company: str(data.company),
  location: str(data.location),
  period: str(data.period),
  highlights: bulletsOf(body),
}));

export const PROJECTS: Project[] = files(
  import.meta.glob('/content/projects/*.md', { query: '?raw', import: 'default', eager: true }),
).map(({ path, data, body }) => ({
  id: slugOf(path),
  title: str(data.title),
  summary: str(data.summary),
  description: bulletsOf(body),
  tech: Array.isArray(data.tech) ? data.tech : [],
  link: str(data.link) || undefined,
  demoUrl: str(data.demoUrl) || undefined,
  date: str(data.date),
}));

export const SKILL_GROUPS: SkillGroup[] = Object.values(
  import.meta.glob('/content/skills.md', { query: '?raw', import: 'default', eager: true }),
).flatMap(raw =>
  parseMarkdown(raw as string)
    .body.split(/^##\s+/m)
    .filter(Boolean)
    .map(section => {
      const [category, ...rest] = section.split('\n');
      return { category: category.trim(), skills: bulletsOf(rest.join('\n')) };
    }),
);

const cv = files(import.meta.glob('/content/cv.md', { query: '?raw', import: 'default', eager: true }))[0];

export const CV_UPDATED = str(cv?.data.updated);

// "## Title" starts a section; each "- name | detail | sub | place" line is one entry
export const CV_SECTIONS: CvSection[] = (cv?.body ?? '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .split(/^##\s+/m)
  .filter(section => section.trim())
  .map(section => {
    const [title, ...rest] = section.split('\n');
    return {
      title: title.trim(),
      entries: bulletsOf(rest.join('\n')).map(line => {
        const [name = '', detail = '', sub = '', place = ''] = line.split('|').map(part => part.trim());
        return { name, detail, sub, place };
      }),
    };
  });

export const BLOG_POSTS: BlogPost[] = files(
  import.meta.glob('/content/blog/*.md', { query: '?raw', import: 'default', eager: true }),
)
  .filter(({ data }) => data.published !== false)
  .map(({ path, data, body }) => ({
    id: slugOf(path),
    slug: slugOf(path),
    title: str(data.title),
    date: str(data.date),
    excerpt: str(data.excerpt),
    content: body,
    category: str(data.category),
    readTime: calculateReadTime(body, str(data.excerpt)),
    published: true,
  }))
  .sort((a, b) => parsePostDate(b.date).getTime() - parsePostDate(a.date).getTime());
