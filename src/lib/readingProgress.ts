// How far into each blog post this browser has read, kept in localStorage as the furthest point reached
// (0 to 1). The furthest point, not the latest, so scrolling back up to reread a paragraph, or a page change
// that resets the scroll, never loses someone's place
const key = (slug: string) => `reading:${slug}`;

/** Under this, a post counts as not started; from FINISHED, as read to the end */
export const STARTED = 0.03;
export const FINISHED = 0.98;

export function readProgress(slug: string): number | null {
  try {
    const value = localStorage.getItem(key(slug));
    if (value === null) return null;
    const progress = Number(value);
    return Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : null;
  } catch {
    // Storage blocked: the rows simply show their read times
    return null;
  }
}

export function saveProgress(slug: string, progress: number) {
  try {
    localStorage.setItem(key(slug), progress.toFixed(3));
  } catch {
    // Storage blocked or full: nothing to remember
  }
}

// Progress is measured where the reader's eye is, 60% down the screen
const EYE_LINE = 0.6;

/** The scroll range the article covers: from its first line reaching the eye line to its last line doing
    so, or the bottom of the page when a tall window or short post can't scroll that far */
function range(body: HTMLElement) {
  const box = body.getBoundingClientRect();
  const top = box.top + window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return { start: top - window.innerHeight * EYE_LINE, end: Math.min(top + box.height - window.innerHeight * EYE_LINE, max) };
}

export function progressOf(body: HTMLElement) {
  const { start, end } = range(body);
  if (end <= start) return window.scrollY >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
}

export function scrollToProgress(body: HTMLElement, progress: number) {
  const { start, end } = range(body);
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: Math.max(0, start + progress * Math.max(0, end - start)), behavior: smooth ? 'smooth' : 'auto' });
}

/** "4 min read" with 60% read is "2 min left"; never under a minute while something is left */
export function timeLeft(readTime: string, progress: number) {
  const minutes = parseInt(readTime, 10);
  if (!Number.isFinite(minutes)) return readTime;
  return `${Math.max(1, Math.ceil(minutes * (1 - progress)))} min left`;
}
