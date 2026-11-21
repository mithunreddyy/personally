import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { toggleTheme } from '../hooks/useTheme';

import { EXPERIENCES } from '../constants';
import { PersonalInfo } from '../types';
import { announce } from './Island';
import { appear, Arrow } from './List';
import { Walker } from './Walker';

const FLAG = '🇮🇳';
// I is handled by the inspector loader in Shell.tsx; it's listed here so its keycap presses in too
const SHORTCUT_KEYS = ['m', 'v', 'd', 't', 'i'];
const HOME_ZONE = 'Asia/Kolkata';
const HOME_CITY = 'hyderabad, india';

// Greets by the hour in Hyderabad so it agrees with the clock beside it; late night gets a plain hello
function greeting(hour: number) {
  if (hour >= 1 && hour < 12) return 'good morning';
  if (hour >= 12 && hour < 15) return 'good afternoon';
  if (hour >= 15 && hour < 18) return 'good evening';
  if (hour >= 18 && hour < 24) return 'good night';

  return 'hello';
}

// Null until the page is running in a browser: the prerendered HTML is built ahead of time, so it must not
// carry a time of its own, and the first browser render has to match it before the clock fills in
function useHomeClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return null;
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: HOME_ZONE });
  return { hello: greeting(Number(time.slice(0, 2))), time };
}

export function downloadResume(url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Mithun_Reddy_Resume.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function Hero({ personalInfo }: { personalInfo: PersonalInfo }) {
  const clock = useHomeClock();
  // The keycap of the shortcut being held down, so its cap visibly presses in
  const [pressed, setPressed] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (!SHORTCUT_KEYS.includes(key)) return;
      setPressed(key);
      if (e.repeat) return;
      if (key === 'm') {
        // Only confirm once the clipboard accepts it, so nothing false is claimed
        navigator.clipboard?.writeText(personalInfo.email).then(() => announce(`Copied ${personalInfo.email}`), () => {});
      } else if (key === 't') {
        toggleTheme();
        announce(document.documentElement.getAttribute('data-theme') === 'light' ? 'Light appearance' : 'Dark appearance');
      } else if (key === 'v') {
        // A blocked popup returns null; only claim the tab opened if it did
        if (window.open(personalInfo.resumeUrl, '_blank')) announce('Resume opened in a new tab');
      } else if (key === 'd') {
        downloadResume(personalInfo.resumeUrl);
        announce('Resume downloading');
      }
    };
    const release = () => setPressed(null);
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', release);
      window.removeEventListener('blur', release);
    };
  }, [personalInfo.email, personalInfo.resumeUrl]);

  const cap = (key: string, label = key.toUpperCase()) => (
    <kbd className="keycap" data-pressed={pressed === key || undefined}>
      {label}
    </kbd>
  );

  const firstName = (personalInfo.name || '').split(' ')[0];
  const current = EXPERIENCES[0];
  // The greeting is his line: it shows once he has walked in and turned to wave
  const [greeted, setGreeted] = useState(false);
  const summary = personalInfo.summary || '';
  const [beforeFlag, afterFlag] = summary.split(FLAG);
  const hasFlag = summary.includes(FLAG);

  return (
    <>
    {/* The first screen is a fixed stage: the page scrolls up over it while it blurs and fades (see
        .home-hero in index.css), the way a sheet slides over what it covers */}
    <section id="hero" aria-label="Introduction" className="home-hero">
      <div className="home-hero-inner flex flex-col gap-3 max-[720px]:gap-2.5">
      {/* He walks in, stops and waves, and the greeting appears beside him as what he says */}
      <div className="hero-arrival mb-3">
        <Walker arrive onGreet={() => setGreeted(true)} />
        <p className="hero-said text-muted" data-said={greeted || undefined} aria-live="off">
          {/* A non-breaking space holds the line's height until the clock arrives, so nothing shifts */}
          {clock ? (
            <>
              “{clock.hello} from {HOME_CITY},{' '}
              {/* "where it's 19:42" stays on one line, so a narrow screen breaks before it, never inside it */}
              <span className="whitespace-nowrap">
                where it's <time className="tabular-nums">{clock.time}</time>”
              </span>
            </>
          ) : (
            '\u00a0'
          )}
        </p>
      </div>

      <div className="appear flex flex-col gap-0.5 mb-2" style={appear(0)}>
        <h1 className="home-name">{personalInfo.name}</h1>
        {/* The newest role, from content/experience; the company stays grey */}
        {current && (
          <p className="text-muted">
            <span className="text-ink">{current.role}</span>, {current.company}
          </p>
        )}
      </div>

      <p className="appear text-ink" style={appear(40)}>
        I'm <span className="text-ink">{firstName}</span>,{' '}
        {hasFlag ? beforeFlag : summary}
        {hasFlag && <span className="text-ink">{afterFlag}</span>}
      </p>

      <p className="appear text-ink" style={appear(60)}>I’ve worked across healthcare, finance, e-commerce, dev tools, and AI. The one thing that’s
        stayed the same is my curiosity to figure out how things work, take them apart, and make them better.</p>

      <p className="appear text-ink" style={appear(80)}>
        The full story is in my <Link to="/cv" className="pencil">CV</Link>, also a PDF you can{' '}
        <a href={personalInfo.resumeUrl} target="_blank" rel="noreferrer" className="group">
          <span className="pencil">view</span>
          <Arrow newTab />
        </a>{' '}
        or{' '}
        <button type="button" onClick={() => downloadResume(personalInfo.resumeUrl)} className="pencil">
          download
        </button>
        .
      </p>

      <p className="appear text-ink" style={appear(100)}>
        Feel free to send me an{' '}
        <a href={`mailto:${personalInfo.email}`} className="pencil">
          email
        </a>{' '}
        or reach out on{' '}
        <a href={`https://linkedin.com/in/${personalInfo.linkedin}`} target="_blank" rel="noreferrer" className="group">
          <span className="pencil">LinkedIn</span>
          <Arrow newTab />
        </a>{' '}
        to grab a coffee. I’d love to chat!
      </p>

      <p className="appear hidden sm:block text-ink" style={appear(120)}>
        Shortcuts: {cap('m')} copies my email, {cap('v')} opens the resume, {cap('d')} downloads it,{' '}
        {cap('t')} switches the theme, {cap('i')} inspects the design, and <kbd className="keycap">⌘K</kbd> opens everything
        else.
      </p>

      </div>
    </section>
    {/* Holds the first screen's place in the page, so the rest starts at its foot */}
    <div className="home-spacer" aria-hidden="true" />
    {/* The way on: a small floating button just above the dock, outside the hero so it never scrolls under
        the dock; it fades out once the page starts to move */}
    <a href="#projects" className="home-next dock-glass" aria-label="Scroll to projects">
      <svg viewBox="0 0 22 10" width="16" height="8" fill="none" aria-hidden="true">
        <path d="M2 2 L11 8 L20 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
    </>
  );
}
