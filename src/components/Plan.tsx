import { X } from 'lucide-react';
import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { BLOG_POSTS, PROJECTS } from '../constants';
import { FINISHED, readProgress, STARTED, timeLeft } from '../lib/readingProgress';
import { visitedPaths } from '../lib/visits';
import { TransitionLink } from './List';
import { StrideFigure } from './StrideFigure';

/*
 * The plan: the whole site drawn as one walk, in the walker's lines. The index is the trailhead, with the CV
 * on a short spur beside it; from there one path runs past every project (a signpost each) and another past
 * every post (a bench each). Footprints mark the paths walked in this visit, the walker stands where you are,
 * and a post you've started carries its reading progress. Under the drawing it is an ordinary list of links,
 * in walking order, so it reads the same to a keyboard or a screen reader.
 */

type Kind = 'start' | 'spur' | 'station' | 'bench';
interface Place {
  to: string;
  label: string;
  kind: Kind;
  detail?: string;
  read?: number;
}

const START: Place = { to: '/', label: 'index', kind: 'start' };
const CV: Place = { to: '/cv', label: 'cv', kind: 'spur' };

/** Small glyphs in the walker's line language: a trailhead, a signpost, a bench */
function Mark({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'start' && <circle cx="11" cy="11" r="4" className="plan-glyph-fill" />}
      {(kind === 'station' || kind === 'spur') && (
        <g className="plan-glyph" strokeWidth="1.3">
          <path d="M8 19 V4" />
          <path d="M8 5.5 H15.5 L17.5 7.75 L15.5 10 H8" />
        </g>
      )}
      {kind === 'bench' && (
        <g className="plan-glyph" strokeWidth="1.3">
          <path d="M4 12.5 H18 M4.6 15 H17.4" />
          <path d="M5.4 15 L4.6 19 M16.6 15 L17.4 19" />
          <path d="M16.6 12.5 L18.4 6.5" />
        </g>
      )}
    </svg>
  );
}

interface Point {
  x: number;
  y: number;
}

/** A gentle S from one place to the next, leaving and arriving vertically, the way a path is drawn on a plan */
const curve = (a: Point, b: Point) =>
  Math.abs(a.y - b.y) < 4
    ? // Side by side (the CV's spur): the path dips under the label between them instead of striking it through
      `M${a.x} ${a.y} C${a.x} ${a.y + 22} ${b.x} ${b.y + 22} ${b.x} ${b.y}`
    : `M${a.x} ${a.y} C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;

export default function Plan({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const [lines, setLines] = useState({ trail: '', walked: '', walker: null as Point | null });

  const projects: Place[] = PROJECTS.map(project => ({ to: `/work/${project.id}`, label: project.title, kind: 'station', detail: project.summary }));
  const [posts, setPosts] = useState<Place[]>(() => BLOG_POSTS.map(post => ({ to: `/blog/${post.slug}`, label: post.title.replace(/\n/g, ' '), kind: 'bench' })));

  // Reading progress comes from this browser, read once the plan is open
  useEffect(() => {
    setPosts(
      BLOG_POSTS.map(post => {
        const progress = readProgress(post.slug);
        const started = progress !== null && progress >= STARTED;
        const finished = started && progress >= FINISHED;
        return {
          to: `/blog/${post.slug}`,
          label: post.title.replace(/\n/g, ' '),
          kind: 'bench',
          read: started ? (finished ? 1 : progress) : undefined,
          detail: started ? (finished ? 'finished' : timeLeft(post.readTime, progress)) : undefined,
        };
      }),
    );
  }, []);

  // The dialog's close event is queued, not immediate. In development React runs this effect twice
  // (open, clean up, open again), so the clean-up's close arrives after the dialog has reopened; an event
  // that finds the dialog open is that stale one and is ignored. Only a real close tells the loader
  const closed = useRef(onClose);
  closed.current = onClose;
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (!node.open) node.showModal();
    const onCloseEvent = () => {
      if (!node.open) closed.current();
    };
    node.addEventListener('close', onCloseEvent);
    return () => {
      node.removeEventListener('close', onCloseEvent);
      if (node.open) node.close();
    };
  }, []);

  // The drawing follows the list: measured from where each place's mark actually sits, at every width
  useLayoutEffect(() => {
    const root = map.current;
    if (!root) return;
    const draw = () => {
      const origin = root.getBoundingClientRect();
      // The sheet may still be mid pull-back (scaled) when this runs, so screen distances are divided by the
      // current scale to get the map's own coordinates
      const scale = origin.width / root.offsetWidth || 1;
      const at = (to: string): Point | null => {
        const mark = root.querySelector<HTMLElement>(`[data-place="${CSS.escape(to)}"] .plan-mark`);
        if (!mark) return null;
        const box = mark.getBoundingClientRect();
        return { x: (box.left - origin.left + box.width / 2) / scale, y: (box.top - origin.top + box.height / 2) / scale };
      };
      const start = at(START.to);
      if (!start) return;
      const visited = new Set([...visitedPaths(), pathname]);
      const trail: string[] = [];
      const walked: string[] = [];
      const step = (from: Point, to: Point, reached: boolean) => {
        const d = curve(from, to);
        trail.push(d);
        if (reached) walked.push(d);
      };

      const cv = at(CV.to);
      if (cv) step(start, cv, visited.has(CV.to));
      for (const branch of [projects, posts]) {
        // A segment counts as walked when any place at or beyond it on this branch was visited
        const points = branch.map(place => at(place.to));
        const lastVisited = branch.reduce((last, place, i) => (visited.has(place.to) ? i : last), -1);
        let previous = start;
        points.forEach((point, i) => {
          if (!point) return;
          step(previous, point, i <= lastVisited);
          previous = point;
        });
      }
      setLines({ trail: trail.join(' '), walked: walked.join(' '), walker: at(pathname) ?? at(START.to) });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(root);
    return () => observer.disconnect();
    // projects never change; posts change once, when reading progress arrives
  }, [posts, pathname]);

  const close = () => dialog.current?.close();

  const place = (item: Place) => (
    <li key={item.to} className="plan-place" data-place={item.to}>
      <span className="plan-mark">
        <Mark kind={item.kind} />
      </span>
      <span className="plan-text">
        <span className={`plan-label${item.read !== undefined ? ' has-read' : ''}`} style={item.read !== undefined ? ({ '--read': item.read } as CSSProperties) : undefined}>
          <TransitionLink
            to={item.to}
            travel={item.kind === 'station' || item.kind === 'bench'}
            beforeChange={close}
            className="link-line"
            aria-current={item.to === pathname ? 'page' : undefined}
          >
            {item.label}
          </TransitionLink>
          {item.to === pathname && <span className="sr-only"> (you are here)</span>}
        </span>
        {item.detail && <span className="plan-detail">{item.detail}</span>}
      </span>
    </li>
  );

  return (
    <dialog
      ref={dialog}
      className="plan"
      aria-labelledby="plan-title"
      // A click on the sheet's empty space (not on a link or the list) folds the plan away
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="plan-sheet">
        <div className="plan-head">
          <h2 id="plan-title" className="text-muted font-normal">
            plan of the site
          </h2>
          <button type="button" onClick={close} className="plan-close" aria-label="Close the plan">
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div ref={map} className="plan-map">
          <svg className="plan-lines" aria-hidden="true">
            <path d={lines.trail} className="plan-trail" />
            <path d={lines.walked} className="plan-walked" />
          </svg>

          <ol className="plan-start" aria-label="Start">
            {place(START)}
            {place(CV)}
          </ol>

          <div className="plan-branches">
            <section aria-labelledby="plan-work">
              <h3 id="plan-work" className="plan-branch-title">
                work
              </h3>
              <ol>{projects.map(place)}</ol>
            </section>
            <section aria-labelledby="plan-writing">
              <h3 id="plan-writing" className="plan-branch-title">
                writing
              </h3>
              <ol>{posts.map(place)}</ol>
            </section>
          </div>

          {lines.walker && (
            <div className="plan-walker" style={{ transform: `translate(${lines.walker.x - 32}px, ${lines.walker.y - 30}px)` }} aria-hidden="true">
              <StrideFigure />
            </div>
          )}
        </div>

        <p className="plan-key">Dotted lines are where you've walked this visit. The walker stands where you are. Press P or Esc to fold it away.</p>
      </div>
    </dialog>
  );
}
