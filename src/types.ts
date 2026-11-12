export interface Project {
  id: string;
  title: string;
  summary: string;
  description: string[];
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
  date: string;
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
