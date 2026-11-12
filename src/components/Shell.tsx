import { Contrast, CornerDownLeft, Github, Linkedin, Mail } from 'lucide-react';
import { lazy, PointerEvent, ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { PERSONAL_INFO } from '../constants';
import { Island, announce } from './Island';
import { toggleTheme, useTheme } from '../hooks/useTheme';

// The command menu (and the Motion library it animates with) loads on first use, not with every page
const CommandPalette = lazy(() => import('./CommandPalette').then(module => ({ default: module.CommandPalette })));
// Inspect mode loads the first time someone asks for it
const Inspector = lazy(() => import('./Inspector'));

/** I (or the command menu) turns Inspect mode on and off; the inspector itself loads on the first turn-on */
function InspectorLoader() {
  const [on, setOn] = useState(false);
  const onRef = useRef(false);

  useEffect(() => {
    const toggle = () => {
      const next = !onRef.current;
      onRef.current = next;
      setOn(next);
      announce(next ? 'Inspecting, press I or Esc to stop' : 'Stopped inspecting');
      // The command menu names its toggle from this
      window.dispatchEvent(new CustomEvent('inspector-change', { detail: next }));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'i' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;
      toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('toggle-inspector', toggle);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('toggle-inspector', toggle);
    };
  }, []);

  if (!on) return null;
  return (
    <Suspense fallback={null}>
      <Inspector onExit={() => window.dispatchEvent(new Event('toggle-inspector'))} />
    </Suspense>
  );
}

/** Waits for the first ⌘K, then loads the menu already open; from then on the menu handles ⌘K itself */
function PaletteLoader() {
  // undefined: not asked for yet; otherwise the element to hand focus back to on close
  const [opener, setOpener] = useState<HTMLElement | null | undefined>(undefined);

  useEffect(() => {
    if (opener !== undefined) return;
    const load = () => setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        load();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-command-palette', load);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-command-palette', load);
    };
  }, [opener]);

  if (opener === undefined) return null;
  return (
    <Suspense fallback={null}>
      <CommandPalette defaultOpen returnFocus={opener} />
    </Suspense>
  );
}

function ThemeToggle() {
  const { theme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={theme === 'dark'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed top-2 right-2 z-50 flex items-center justify-center w-11 h-11 text-muted opacity-70 hover:opacity-100 hover:text-ink transition print:hidden"
    >
      <Contrast size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

const dockIcon = 'dock-item relative flex items-center justify-center w-11 h-11 rounded-full text-ink';

/** One dock button: the icon, plus the name that rises above it on hover or keyboard focus, as in the macOS Dock */
function DockGlyph({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="dock-glyph flex items-center justify-center w-full h-full rounded-full">{children}</span>
      <span className="dock-label" aria-hidden="true">
        {label}
      </span>
    </>
  );
}

// Icons swell as a mouse pointer nears them, like the macOS Dock: up to 30% larger, fading out over 72px
const MAGNIFY = 0.3;
const REACH = 72;

/** Contact shortcuts, plus a way home once you leave the index */
function Dock({ showIndex }: { showIndex: boolean }) {
  const { email, github, linkedin } = PERSONAL_INFO;
  const bar = useRef<HTMLDivElement>(null);

  const magnify = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !bar.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    bar.current.querySelectorAll<HTMLElement>('.dock-item').forEach(item => {
      const box = item.getBoundingClientRect();
      const distance = Math.abs(e.clientX - (box.left + box.width / 2));
      item.style.setProperty('--mag', String(1 + MAGNIFY * Math.max(0, 1 - distance / REACH)));
    });
  };
  const settle = () => {
    bar.current?.querySelectorAll<HTMLElement>('.dock-item').forEach(item => item.style.removeProperty('--mag'));
  };

  return (
    <nav
      aria-label="Quick links"
      className="fixed left-0 right-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-50 flex justify-center pointer-events-none print:hidden"
    >
      <div
        ref={bar}
        onPointerMove={magnify}
        onPointerLeave={settle}
        className="dock-glass pointer-events-auto flex items-end gap-0.5 p-1 rounded-3xl"
      >
        {showIndex && (
          <Link to="/" aria-label="Back to index" className={`${dockIcon} text-muted`}>
            <DockGlyph label="Index">
              <CornerDownLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            </DockGlyph>
          </Link>
        )}
        <a href={`mailto:${email}`} aria-label={`Email ${email}`} className={dockIcon}>
          <DockGlyph label="Email">
            <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
          </DockGlyph>
        </a>
        <a href={`https://github.com/${github}`} target="_blank" rel="noreferrer" aria-label="GitHub" className={dockIcon}>
          <DockGlyph label="GitHub">
            <Github size={16} strokeWidth={1.75} aria-hidden="true" />
          </DockGlyph>
        </a>
        <a href={`https://linkedin.com/in/${linkedin}`} target="_blank" rel="noreferrer" aria-label="LinkedIn" className={dockIcon}>
          <DockGlyph label="LinkedIn">
            <Linkedin size={16} strokeWidth={1.75} aria-hidden="true" />
          </DockGlyph>
        </a>
      </div>
    </nav>
  );
}

/** Frame shared by every route: theme switch, dock, command palette, one reading column */
export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a href="#content" className="skip-link print:hidden">Skip to content</a>
      <ThemeToggle />
      <PaletteLoader />
      <InspectorLoader />
      <Island />
      <main id="content" tabIndex={-1} className="outline-none relative mx-auto w-full max-w-[600px] min-w-0 px-[30px] pt-[120px] pb-36 max-[720px]:max-w-[624px] max-[720px]:px-8 max-[720px]:pt-16 max-[359.98px]:px-5 text-[15px] leading-[23px] print:p-0 print:max-w-none print:w-full">
        {children}
      </main>
      <Dock showIndex={pathname !== '/'} />
    </>
  );
}
