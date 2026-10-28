import { PersonalInfo } from '../types';
import { EmailCopy } from './EmailCopy';
import { Arrow, Section } from './List';

export function Connect({ personalInfo, delay = 0 }: { personalInfo: PersonalInfo; delay?: number }) {
  return (
    <Section id="contact" title="connect" delay={delay}>
      <p className="text-muted">
        The quickest way to reach me is email: <EmailCopy email={personalInfo.email} />. My code lives on{' '}
        <a href={`https://github.com/${personalInfo.github}`} target="_blank" rel="noreferrer" className="group">
          <span className="link-line">GitHub</span>
          <Arrow newTab />
        </a>
        , and my work history on{' '}
        <a href={`https://linkedin.com/in/${personalInfo.linkedin}`} target="_blank" rel="noreferrer" className="group">
          <span className="link-line">LinkedIn</span>
          <Arrow newTab />
        </a>
        .
      </p>
    </Section>
  );
}
