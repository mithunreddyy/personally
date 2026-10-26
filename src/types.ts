export interface Project {
  id: string;
  title: string;
  description: string[];
  tech: string[];
  link?: string;
  demoUrl?: string;
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
