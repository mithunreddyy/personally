import { CornerDownLeft } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { appear } from './List';

export interface TocItem {
  id: string;
  label: string;
}

/** Tracks which heading is nearest the top of the viewport */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join('|');

  useEffect(() => {
    if (!ids.length) return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // ids is rebuilt every render; key changes only when the headings do
  }, [key]);

  return active;
}

/**
 * Reading page frame: a pinned index on wide screens (back link, issue number,
 * contents), then title, meta line, and the body.
 */
export function Article({
  index,
  title,
  meta,
  toc = [],
  children,
}: {
  index: string;
  title: ReactNode;
  meta: ReactNode;
  toc?: TocItem[];
  children: ReactNode;
}) {
  const active = useActiveHeading(toc.map(t => t.id));

  return (
    <>
      <nav
        aria-label="Contents"
        className="appear flex flex-col gap-3.5 mb-6 text-[13px] leading-[19px] min-[1180px]:fixed min-[1180px]:left-16 min-[1180px]:top-[120px] min-[1180px]:w-[200px] min-[1180px]:mb-0"
        style={appear(0)}
      >
        <p className="flex items-center gap-1.5 text-muted">
          <Link
            to="/"
            aria-label="Back to index"
            className="inline-flex items-center justify-center -m-3 p-3 hover:text-ink transition-colors"
          >
            <CornerDownLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <span className="ml-1">{index}</span>
        </p>
        {toc.length > 1 && (
          <ol className="hidden min-[1180px]:flex flex-col gap-px">
            {toc.map(item => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`hover:text-ink transition-colors ${
                    active === item.id ? 'text-ink underline underline-offset-[3px] decoration-1' : 'text-muted'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        )}
      </nav>

      <header className="appear flex flex-col gap-1.5 pb-7" style={appear(0)}>
        <h1 className="text-ink font-normal">{title}</h1>
        <p className="text-muted">{meta}</p>
      </header>

      <div className="appear flex flex-col gap-10 pb-7 min-w-0 max-w-full" style={appear(80)}>
        {children}
      </div>
    </>
  );
}

/** One titled stretch of prose inside an article */
export function ArticleSection({ id, title, children }: { id?: string; title?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-3.5 scroll-mt-24 min-w-0 max-w-full">
      {title && <h2 className="text-muted font-normal">{title}</h2>}
      <div className="prose-flow flex flex-col gap-4 text-ink/85 leading-[25px] min-w-0 max-w-full">{children}</div>
    </section>
  );
}
