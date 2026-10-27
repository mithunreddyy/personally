import { Contrast, CornerDownLeft, Github, Linkedin, Mail } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { PERSONAL_INFO } from '../constants';
import { toggleTheme, useTheme } from '../hooks/useTheme';
import { CommandPalette } from './CommandPalette';

const dockIcon =
  'flex items-center justify-center w-11 h-11 rounded-full text-ink transition-colors hover:bg-ink/[0.06] active:scale-[0.93]';

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

/** Contact shortcuts, plus a way home once you leave the index */
function Dock({ showIndex }: { showIndex: boolean }) {
  const { email, github, linkedin } = PERSONAL_INFO;
  return (
    <nav
      aria-label="Quick links"
      className="fixed left-0 right-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-50 flex justify-center pointer-events-none print:hidden"
    >
      <div className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-3xl border border-line bg-bg">
        {showIndex && (
          <Link to="/" aria-label="Back to index" className={`${dockIcon} text-muted`}>
            <CornerDownLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
        <a href={`mailto:${email}`} aria-label={`Email ${email}`} className={dockIcon}>
          <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
        </a>
        <a href={`https://github.com/${github}`} target="_blank" rel="noreferrer" aria-label="GitHub" className={dockIcon}>
          <Github size={16} strokeWidth={1.75} aria-hidden="true" />
        </a>
        <a href={`https://linkedin.com/in/${linkedin}`} target="_blank" rel="noreferrer" aria-label="LinkedIn" className={dockIcon}>
          <Linkedin size={16} strokeWidth={1.75} aria-hidden="true" />
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
      <CommandPalette />
      <main id="content" tabIndex={-1} className="outline-none relative mx-auto w-full max-w-[600px] min-w-0 px-5 pt-16 sm:pt-[120px] pb-36 text-[16px] leading-[24px] print:p-0 print:max-w-none print:w-full">
        {children}
      </main>
      <Dock showIndex={pathname !== '/'} />
    </>
  );
}
