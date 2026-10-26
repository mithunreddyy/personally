import { AnimatePresence, motion } from 'motion/react';
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme, toggleTheme } from '../hooks/useTheme';
import { BLOG_POSTS, PERSONAL_INFO, PROJECTS } from '../constants';
import { scrollToSection } from '../lib/utils';
import { downloadResume } from './Hero';

interface PaletteCommand {
  id: string;
  name: string;
  run: () => void;
  // Commands that keep the palette open (e.g. copy feedback)
  keepOpen?: boolean;
}

export function CommandPalette() {
  const personalInfo = PERSONAL_INFO;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [emailCopied, setEmailCopied] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Reset state and remember the trigger when opening; restore focus when closing
  const openPalette = useCallback(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setSearch('');
    setActiveIndex(0);
    setEmailCopied(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    returnFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) close();
        else openPalette();
      } else if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-command-palette', openPalette);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-command-palette', openPalette);
    };
  }, [isOpen, close, openPalette]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(personalInfo.email);
      setEmailCopied(true);
    } catch {
      // Clipboard blocked: the label stays as it was, so nothing false is claimed
    }
  };

  // Sections live on the index; from any other page, go home first and land there
  const goTo = useCallback((id: string) => {
    if (pathname === '/') scrollToSection(id);
    else navigate('/', { state: { scrollTo: id } });
  }, [pathname, navigate]);

  const commands = useMemo<PaletteCommand[]>(() => [
    { id: 'cv', name: 'CV', run: () => navigate('/cv') },
    { id: 'projects', name: 'Projects', run: () => goTo('projects') },
    { id: 'stack', name: 'Stack', run: () => goTo('skills') },
    { id: 'blog', name: 'Writing', run: () => goTo('blog') },
    { id: 'contact', name: 'Connect', run: () => goTo('contact') },
    {
      id: 'theme',
      name: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      run: toggleTheme,
    },
    {
      id: 'email',
      name: emailCopied ? 'Email copied' : 'Copy email address',
      run: copyEmail,
      keepOpen: true,
    },
    { id: 'resume', name: 'Download resume', run: () => downloadResume(personalInfo.resumeUrl) },
    ...PROJECTS.map((project): PaletteCommand => ({
      id: `work-${project.id}`,
      name: `Open ${project.title}`,
      run: () => navigate(`/work/${project.id}`),
    })),
    ...BLOG_POSTS.map((post): PaletteCommand => ({
      id: `post-${post.slug}`,
      name: `Read ${post.title.replace(/\n/g, ' ')}`,
      run: () => navigate(`/blog/${post.slug}`),
    })),
  ], [theme, emailCopied, personalInfo.resumeUrl, navigate, goTo]);

  const filtered = commands.filter((cmd) => cmd.name.toLowerCase().includes(search.trim().toLowerCase()));
  const currentIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
  const activeCommand = filtered[currentIndex];

  // Keep the highlighted option visible while arrowing through a long list
  useEffect(() => {
    if (!activeCommand) return;
    document.getElementById(`cmd-${activeCommand.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeCommand]);

  const runCommand = (cmd: PaletteCommand) => {
    cmd.run();
    if (!cmd.keepOpen) close();
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(filtered.length ? (currentIndex + 1) % filtered.length : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(filtered.length ? (currentIndex - 1 + filtered.length) % filtered.length : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeCommand) runCommand(activeCommand);
    } else if (e.key === 'Tab') {
      // Focus stays inside the dialog while it is open
      e.preventDefault();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[18vh] px-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-bg/70"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[440px] bg-bg border border-line rounded-xl overflow-hidden text-[17px] leading-[26px]"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
              <input
                type="text"
                autoFocus
                role="combobox"
                aria-expanded="true"
                aria-controls="command-listbox"
                aria-autocomplete="list"
                aria-activedescendant={activeCommand ? `cmd-${activeCommand.id}` : undefined}
                aria-label="Search pages and actions"
                placeholder="Search pages and actions"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-ink placeholder:text-muted"
              />
              <span className="text-muted text-[15px]" aria-hidden="true">esc</span>
            </div>
            <div id="command-listbox" role="listbox" aria-label="Results" className="max-h-[300px] overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p role="status" className="px-2.5 py-2 text-muted">Nothing matches "{search}". Try a page name, like Writing.</p>
              ) : (
                filtered.map((cmd, i) => {
                  const isActive = i === currentIndex;
                  return (
                    <button
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      role="option"
                      aria-selected={isActive}
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => runCommand(cmd)}
                      className={`w-full block px-2.5 py-2 text-left rounded-lg transition-colors ${isActive ? 'bg-ink/[0.05] text-ink' : 'text-muted'}`}
                    >
                      {cmd.name}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
