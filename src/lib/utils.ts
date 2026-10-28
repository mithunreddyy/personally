/** Reads a frontmatter date: YYYY-MM-DD, or YYYY-MM-DDTHH:mm when several posts share a day */
export function parsePostDate(raw: string): Date {
  return new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
}

/**
 * Formats a post date as "Feb 2025" (short), "21 Feb 2025" (day) or "21 February 2025" (long)
 */
export function formatPostDate(raw: string, style: 'short' | 'day' | 'long' = 'short'): string {
  const d = parsePostDate(raw);
  if (isNaN(d.getTime())) return raw;
  const options: Intl.DateTimeFormatOptions =
    style === 'short' ? { month: 'short', year: 'numeric' }
    : style === 'day' ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('en-GB', options);
}

/**
 * Scrolls to a page section, leaving a small gap below the top edge
 */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 20;
  window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * Shows a URL as host plus path, e.g. "github.com/owner/repo"
 */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return url;
  }
}

/**
 * Calculates read time in minutes based on content
 */
export function calculateReadTime(content: string = "", excerpt: string = ""): string {
  const combinedText = `${excerpt} ${content}`;
  const words = combinedText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}
