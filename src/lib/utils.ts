/**
 * Formats a YYYY-MM-DD date as "Feb 2025" (short) or "21 February 2025" (long)
 */
export function formatPostDate(raw: string, style: 'short' | 'long' = 'short'): string {
  const d = new Date(`${raw}T00:00:00`);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', style === 'short'
    ? { month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
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
