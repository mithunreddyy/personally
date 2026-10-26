import { PersonalInfo } from '../types';
import { EmailCopy } from './EmailCopy';
import { Section } from './List';

export function Connect({ personalInfo, delay = 0 }: { personalInfo: PersonalInfo; delay?: number }) {
  return (
    <Section id="contact" title="Connect" delay={delay}>
      <p className="text-muted">
        The quickest way to reach me is email: <EmailCopy email={personalInfo.email} />. My code lives on{' '}
        <a href={`https://github.com/${personalInfo.github}`} target="_blank" rel="noreferrer" className="link-line">
          GitHub
        </a>
        , and my work history on{' '}
        <a href={`https://linkedin.com/in/${personalInfo.linkedin}`} target="_blank" rel="noreferrer" className="link-line">
          LinkedIn
        </a>
        .
      </p>
    </Section>
  );
}
