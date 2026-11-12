import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { toggleTheme } from '../hooks/useTheme';

import { PersonalInfo } from '../types';
import { appear, Arrow } from './List';
import { announce } from './Island';
import { Walker } from './Walker';

const FLAG = '🇮🇳';
const SHORTCUT_KEYS = ['m', 'v', 'd', 't'];
const HOME_ZONE = 'Asia/Kolkata';
const HOME_CITY = 'India';

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
  const summary = personalInfo.summary || '';
  const [beforeFlag, afterFlag] = summary.split(FLAG);
  const hasFlag = summary.includes(FLAG);

  return (
    <section id="hero" aria-label="Introduction" className="flex flex-col gap-3 pb-10 max-[720px]:gap-2.5">
      <h1 className="sr-only">{personalInfo.name}, {personalInfo.role}</h1>

      {/* Decorative: the sr-only h1 above carries the name */}
      <Walker className="self-start mb-3" />

      {/* 14px from the greeting to the intro, 12px between paragraphs (12 and 10 on phones) */}
      <p className="appear text-muted mb-1" style={appear(20)}>
        {/* A non-breaking space holds the line's height until the clock arrives, so nothing below shifts */}
        {clock ? (
          <>
            {clock.hello} from {HOME_CITY}, where it's <time className="tabular-nums">{clock.time}</time>
          </>
        ) : (
          '\u00a0'
        )}
      </p>

      <p className="appear text-body" style={appear(40)}>
        I'm <span className="text-ink">{firstName}</span>,{' '}
        {hasFlag ? beforeFlag : summary}
        {hasFlag && <span className="text-ink">{afterFlag}</span>}
      </p>

      <p className="appear text-body" style={appear(60)}>I’ve worked across healthcare, finance, e-commerce, dev tools, and AI. The one thing that’s
        stayed the same is my curiosity to figure out how things work, take them apart, and make them better.</p>

      <p className="appear text-body" style={appear(80)}>
        The full story is in my <Link to="/cv" className="link-line">CV</Link>, also a PDF you can{' '}
        <a href={personalInfo.resumeUrl} target="_blank" rel="noreferrer" className="group">
          <span className="link-line">view</span>
          <Arrow newTab />
        </a>{' '}
        or{' '}
        <button type="button" onClick={() => downloadResume(personalInfo.resumeUrl)} className="link-line">
          download
        </button>
        .
      </p>

      <p className="appear hidden sm:block text-body" style={appear(120)}>
        Shortcuts: {cap('m')} copies my email, {cap('v')} opens the resume, {cap('d')} downloads it,{' '}
        {cap('t')} switches the theme, and <kbd className="keycap">⌘K</kbd> opens everything else.
      </p>
    </section>
  );
}
