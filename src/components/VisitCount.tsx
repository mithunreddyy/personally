import { useEffect, useState } from 'react';

import { useHyderabadWeather } from '../lib/weather';
import { appear } from './List';

const COUNTED_KEY = 'visit-counted';
// The place the counter named when this session's visit was counted. Asked again later, the counter would
// name this visitor's own city, so the first answer is kept for the session
const BEFORE_KEY = 'visit-before';

interface Place {
  city?: string;
  country?: string;
}

const regions = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

/** "Hyderabad, India", "India", or null when there is nothing to name */
function placeWords(place: Place | null): string | null {
  if (!place) return null;
  const city = typeof place.city === 'string' ? place.city : '';
  let country = '';
  if (typeof place.country === 'string' && /^[A-Z]{2}$/.test(place.country)) {
    try {
      const name = regions?.of(place.country);
      if (name && name !== place.country) country = name;
    } catch {
      // An unknown code: the city alone, or nothing
    }
  }
  return [city, country].filter(Boolean).join(', ') || null;
}

function readBefore(): Place | null {
  try {
    const saved = sessionStorage.getItem(BEFORE_KEY);
    return saved ? (JSON.parse(saved) as Place) : null;
  } catch {
    return null;
  }
}

/**
 * Counts once per browser session, then shows the site-wide total from the worker, and where the visit
 * before this one came from
 */
function useVisits() {
  const [total, setTotal] = useState<number | null>(null);
  const [before, setBefore] = useState<string | null>(null);

  useEffect(() => {
    let counted = false;
    try {
      counted = sessionStorage.getItem(COUNTED_KEY) === '1';
      sessionStorage.setItem(COUNTED_KEY, '1');
    } catch {
      // Storage blocked: this load counts, which can only add one extra visit
    }

    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}api/visits`, { method: counted ? 'GET' : 'POST', signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then((data: { total?: unknown; last?: Place | null } | null) => {
        if (typeof data?.total !== 'number') return;
        setTotal(data.total);
        if (!counted) {
          setBefore(placeWords(data.last ?? null));
          try {
            if (data.last) sessionStorage.setItem(BEFORE_KEY, JSON.stringify(data.last));
          } catch {
            // Storage blocked: later pages in this session just leave the place out
          }
        } else {
          setBefore(placeWords(readBefore()));
        }
      })
      // No counter (local dev, the GitHub Pages backup, or an outage): the line stays empty rather than guess
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return { total, before };
}

export function VisitCount({ delay = 0 }: { delay?: number }) {
  const { total, before } = useVisits();
  // The walker's weather comes from Open-Meteo, whose licence asks for a credit wherever it is shown
  const weather = useHyderabadWeather();

  return (
    // The line keeps its height while loading, so nothing jumps when the number arrives
    <footer
      className="appear min-h-5 flex flex-wrap gap-x-3 text-[10.5px] min-[721px]:text-[11px] leading-5 tracking-[0.02em] text-muted tabular-nums"
      style={appear(delay)}
    >
      {total !== null && <span>{`${total.toLocaleString('en-US')} ${total === 1 ? 'visit' : 'visits'}`}</span>}
      {before && <span>Last visitor from {before}</span>}
      {weather && (
        <span>
          Weather from{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="link-line">
            Open-Meteo
          </a>
        </span>
      )}
    </footer>
  );
}
