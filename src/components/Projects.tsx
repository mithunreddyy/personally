import { PERSONAL_INFO } from '../constants';
import { formatPostDate } from '../lib/utils';
import { Project } from '../types';
import { Arrow, Section, TextLink } from './List';

/** Title left, date right, one row per project */
export function Projects({ projects, delay = 0 }: { projects: Project[]; delay?: number }) {
  return (
    <Section id="projects" title="Projects" delay={delay}>
      {projects.length === 0 ? (
        <p className="text-muted">No projects listed yet.</p>
      ) : (
        <ol className="focus-index flex flex-col gap-1.5">
          {projects.map(project => (
            <li key={project.id} className="focus-item flex items-baseline justify-between gap-4">
              <span className="focus-title min-w-0">
                <TextLink to={`/work/${project.id}`} arrow>{project.title}</TextLink>
              </span>
              {project.date && (
                <time dateTime={project.date} className="shrink-0 text-muted">
                  {formatPostDate(project.date)}
                </time>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="text-muted">
        Everything else lives on{' '}
        <a href={`https://github.com/${PERSONAL_INFO.github}`} target="_blank" rel="noreferrer" className="group">
          <span className="link-line">GitHub</span>
          <Arrow newTab />
        </a>
        .
      </p>
    </Section>
  );
}
