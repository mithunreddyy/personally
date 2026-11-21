export interface Project {
  id: string;
  title: string;
  summary: string;
  /** The paragraph before the first "## " heading: the page's lead */
  intro: string;
  /** Each "## " heading of the write-up, in order */
  sections: CaseSection[];
  /** "Label | value" lines: the at-a-glance sheet */
  facts: { label: string; value: string }[];
  /** "0:04 | Title" lines: moments in the film a reader can jump to */
  scenes: { at: number; title: string }[];
  /** "2026-11-10 | What happened" lines from the repo's commit log, oldest first */
  timeline: { date: string; event: string }[];
  /** "What it is | url" lines; the write-up cites them in order as [1], [2] */
  notes: { text: string; url: string }[];
  tech: string[];
  link?: string;
  demoUrl?: string;
  /** Path under public/, e.g. "projects/nook.svg" */
  logo?: string;
  /** One measured result, shown as the page's lead. Real numbers only; leave it out otherwise */
  outcome?: string;
  /** A screenshot (.png, .jpg, .webp) or screen recording (.mp4, .webm) under public/, shown above the details */
  media?: string;
  /** What the media shows, for screen readers */
  mediaAlt?: string;
  /** "width x height" of the media in pixels, so the page keeps its space before it loads */
  mediaSize?: string;
  /** A still from the recording, shown until it plays */
  poster?: string;
  date: string;
}

/** A blank-line-separated block: prose, a bullet list, or "- label | value" rows */
export type CaseBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'rows'; rows: { label: string; value: string }[] };

export interface CaseSection {
  id: string;
  title: string;
  blocks: CaseBlock[];
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  location: string;
  period: string;
  highlights: string[];
}

export interface CvEntry {
  name: string;
  detail: string;
  sub: string;
  place: string;
}

export interface CvSection {
  title: string;
  entries: CvEntry[];
}

export interface SkillGroup {
  category: string;
  skills: string[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content?: string;
  category: string;
  readTime: string;
  published?: boolean;
}

export interface PersonalInfo {
  name: string;
  role: string;
  location: string;
  email: string;
  github: string;
  linkedin: string;
  birthYear: number;
  resumeUrl: string;
  summary: string;
}
