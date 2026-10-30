import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { toggleTheme } from '../hooks/useTheme';

import { PersonalInfo } from '../types';
import { appear, Arrow } from './List';

const FLAG = '🇮🇳';
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

function useHomeClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
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
  const { hello, time } = useHomeClock();
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    if (!emailCopied) return;
    const timer = setTimeout(() => setEmailCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [emailCopied]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'm') {
        // Only confirm once the clipboard accepts it, so nothing false is claimed
        navigator.clipboard?.writeText(personalInfo.email).then(() => setEmailCopied(true), () => {});
      } else if (key === 't') toggleTheme();
      else if (key === 'v') window.open(personalInfo.resumeUrl, '_blank');
      else if (key === 'd') downloadResume(personalInfo.resumeUrl);
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [personalInfo.email, personalInfo.resumeUrl]);

  const firstName = (personalInfo.name || '').split(' ')[0];
  const summary = personalInfo.summary || '';
  const [beforeFlag, afterFlag] = summary.split(FLAG);
  const hasFlag = summary.includes(FLAG);

  return (
    <section id="hero" aria-label="Introduction" className="flex flex-col gap-3 pb-10 max-[720px]:gap-2.5">
      <h1 className="sr-only">{personalInfo.name}, {personalInfo.role}</h1>

      {/* 14px from the greeting to the intro, 12px between paragraphs (12 and 10 on phones) */}
      <p className="appear text-muted mb-0.5">
        {hello} from {HOME_CITY}, where it's <time className="tabular-nums">{time}</time>
      </p>

      <p className="appear text-muted"  style={appear(40)}>
        I'm <span className="text-ink">{firstName}</span>,{' '}
        {hasFlag ? beforeFlag : summary}
        {hasFlag && <span className="text-ink">{afterFlag}</span>}
      </p>

      <p className="appear text-muted" style={appear(60)}>I’ve worked across healthcare,finance, e-commerce, dev tools, and AI. The one thing that’s
        stayed the same is my curiosity to figure out how things work, take them apart, and make them better.</p>

      <p className="appear text-muted" style={appear(80)}>
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

      <p className="appear hidden sm:block text-muted" style={appear(120)}>
        Shortcuts: <kbd className="font-sans text-ink">M</kbd> copies my email,{' '}
        <kbd className="font-sans text-ink">V</kbd> opens the resume,{' '}
        <kbd className="font-sans text-ink">D</kbd> downloads it,{' '}
        <kbd className="font-sans text-ink">T</kbd> switches the theme, and{' '}
        <kbd className="font-sans text-ink">⌘K</kbd> opens everything else.{' '}
        <span role="status" className="text-ink">
          {emailCopied ? `Copied ${personalInfo.email}.` : ''}
        </span>
      </p>
    </section>
  );
}
