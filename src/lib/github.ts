import { useEffect, useState } from 'react';

import { PERSONAL_INFO } from '../constants';

const DAY_MS = 86_400_000;

// One request for the whole page, however many project rows ask
let shared: Promise<Record<string, string> | null> | null = null;

function loadPushed(): Promise<Record<string, string> | null> {
  shared ??= fetch(`${import.meta.env.BASE_URL}api/github`)
    .then(res => (res.ok ? res.json() : null))
    .then((data: { pushed?: unknown } | null) =>
      data?.pushed && typeof data.pushed === 'object' ? (data.pushed as Record<string, string>) : null,
    )
    .catch(() => null);
  return shared;
}

/** "nook" from https://github.com/mithunreddyy/nook, only for the owner's own repos */
function repoName(link?: string): string | null {
  const match = link?.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match || match[1].toLowerCase() !== PERSONAL_INFO.github.toLowerCase()) return null;
  return match[2].toLowerCase();
}

/**
 * When a project's GitHub repo was last pushed to, from the worker. Null until it arrives, and it stays
 * null without the worker (local dev, the GitHub Pages backup) or when GitHub can't be reached
 */
export function useLastPush(link?: string): Date | null {
  const [pushed, setPushed] = useState<Date | null>(null);

  useEffect(() => {
    const name = repoName(link);
    if (!name) return;
    let alive = true;
    loadPushed().then(all => {
      const at = all?.[name] ? new Date(all[name]) : null;
      if (alive && at && !Number.isNaN(at.getTime())) setPushed(at);
    });
    return () => {
      alive = false;
    };
  }, [link]);

  return pushed;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "today", "yesterday", "3 days ago", "last week", "2 months ago" */
export function sinceWords(at: Date, now = Date.now()): string {
  const days = Math.floor((now - at.getTime()) / DAY_MS);
  if (days < 1) return 'today';
  if (days < 7) return relative.format(-days, 'day');
  if (days < 30) return relative.format(-Math.round(days / 7), 'week');
  if (days < 365) return relative.format(-Math.round(days / 30), 'month');
  return relative.format(-Math.round(days / 365), 'year');
}
