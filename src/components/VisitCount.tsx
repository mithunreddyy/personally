import { useEffect, useState } from 'react';
import { appear } from './List';

const COUNTED_KEY = 'visit-counted';

/** Counts once per browser session, then shows the site-wide total from the worker */
function useVisitTotal() {
  const [total, setTotal] = useState<number | null>(null);

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
      .then((data: { total?: unknown } | null) => {
        if (typeof data?.total === 'number') setTotal(data.total);
      })
      // No counter (local dev, the GitHub Pages backup, or an outage): the line stays empty rather than guess
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return total;
}

export function VisitCount({ delay = 0 }: { delay?: number }) {
  const total = useVisitTotal();

  return (
    // The line keeps its height while loading, so nothing jumps when the number arrives
    <footer className="appear min-h-5 text-[10.5px] min-[721px]:text-[11px] leading-5 tracking-[0.02em] text-muted tabular-nums" style={appear(delay)}>
      {total !== null && `${total.toLocaleString('en-US')} ${total === 1 ? 'visit' : 'visits'}`}
    </footer>
  );
}
