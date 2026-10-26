import { useEffect, useState } from 'react';

import { CV_SECTIONS, CV_UPDATED, EXPERIENCES, PERSONAL_INFO } from '../constants';
import { formatPostDate } from '../lib/utils';
import { CvSection } from '../types';
import { EmailCopy } from './EmailCopy';
import { ExperienceSection } from './Experience';
import { downloadResume } from './Hero';
import { appear, CollapsibleSection, Entry, Section } from './List';
import { SEO } from './SEO';

const HOME_ZONE = 'Asia/Kolkata';

function useSecondsClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: HOME_ZONE })
    .toLowerCase();
}

function Entries({ section }: { section?: CvSection }) {
  if (!section?.entries.length) {
    return <p className="text-muted">Nothing here yet. Add entries in content/cv.md.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {section.entries.map((entry, i) => (
        <Entry key={i} name={entry.name} detail={entry.detail} sub={entry.sub} place={entry.place} />
      ))}
    </div>
  );
}

export function CvView() {
  const time = useSecondsClock();
  const section = (title: string) => CV_SECTIONS.find(s => s.title.toLowerCase() === title.toLowerCase());

  return (
    <>
      <SEO title="CV" description={`${PERSONAL_INFO.name}, ${PERSONAL_INFO.role}.`} />

      <header
        className="appear grid grid-cols-[minmax(0,1fr)_auto] max-[479px]:grid-cols-1 gap-x-4 gap-y-3 items-baseline pb-9"
        style={appear(0)}
      >
        <div>
          <h1 className="text-ink font-normal">{PERSONAL_INFO.name}</h1>
          {CV_UPDATED && (
            <p className="text-muted">
              Updated <time dateTime={CV_UPDATED}>{formatPostDate(CV_UPDATED, 'long')}</time>
            </p>
          )}
        </div>
        <EmailCopy email={PERSONAL_INFO.email} />
      </header>

      <Section title="Currently" delay={40}>
        <Entries section={section('Currently')} />
      </Section>

      <ExperienceSection experiences={EXPERIENCES} delay={80} />

      <CollapsibleSection title="Earlier" delay={120}>
        <Entries section={section('Earlier')} />
      </CollapsibleSection>

      <CollapsibleSection title="Education" delay={160}>
        <Entries section={section('Education')} />
      </CollapsibleSection>

      <section className="appear border-t border-line pt-3.5 pb-16" style={appear(200)}>
        <button type="button" onClick={() => downloadResume(PERSONAL_INFO.resumeUrl)} className="link-line">
          Download PDF
        </button>
      </section>

      <footer className="appear flex items-baseline gap-2.5 text-[11.5px] sm:text-[12px] leading-5 text-muted tabular-nums" style={appear(240)}>
        <span className="tracking-[0.04em]">GMT+5:30</span>
        <time>{time}</time>
      </footer>
    </>
  );
}
