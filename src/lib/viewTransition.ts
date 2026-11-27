import { flushSync } from 'react-dom';
import type { NavigateFunction } from 'react-router-dom';

type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

// The browser holds the old page on screen while the new one loads. Past this, the new page shows with
// its loading line rather than freezing the screen any longer
const READY_TIMEOUT = 1200;

/** Resolves once the new route is on screen (Shell marks main with the rendered path) and has replaced
    Suspense's loading line (App.tsx marks it), or after the timeout. React Router applies the change in a
    React transition, so the old page stays up while a chunk loads; the path tells the two apart.
    Polls with timers: animation frames don't run while a view transition holds rendering */
function routeReady(to: string): Promise<void> {
  const started = performance.now();
  const path = to.split(/[?#]/)[0];
  return new Promise(resolve => {
    const check = () => {
      const shown = document.querySelector('main')?.getAttribute('data-path') === path && !document.querySelector('[data-route-loading]');
      if (shown || performance.now() - started > READY_TIMEOUT) resolve();
      else window.setTimeout(check, 16);
    };
    check();
  });
}

/**
 * Changes page with continuity: the old page steps aside and the new one steps in, forward for going
 * deeper and back for returning to the index, and when `title` is given (the clicked entry's title) it
 * travels into the new page's heading (`.vt-title`). Without View Transitions, or under reduced motion,
 * it is a plain navigation.
 */
export function navigateWithTransition(
  navigate: NavigateFunction,
  to: string,
  title?: HTMLElement | null,
  /** Runs just before the page changes, after the old page is captured: the plan closes here */
  before?: () => void,
) {
  const doc = document as TransitionDocument;
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    before?.();
    navigate(to);
    return;
  }

  const root = document.documentElement;
  root.dataset.vt = to === '/' ? 'back' : 'forward';
  let target: HTMLElement | null = null;
  if (title) {
    // A named element must be one box, so a title that wraps is captured as a single block
    title.style.display = 'inline-block';
    title.style.viewTransitionName = 'page-title';
  }

  const transition = doc.startViewTransition(async () => {
    before?.();
    flushSync(() => navigate(to));
    window.scrollTo(0, 0);
    await routeReady(to);
    window.scrollTo(0, 0);
    if (title) {
      target = document.querySelector<HTMLElement>('.vt-title');
      if (target) target.style.viewTransitionName = 'page-title';
    }
  });

  // A skipped transition (another one started, a duplicate name) still navigates; nothing to report
  transition.ready.catch(() => {});
  transition.finished
    .catch(() => {})
    .finally(() => {
      delete root.dataset.vt;
      target?.style.removeProperty('view-transition-name');
    });
}
