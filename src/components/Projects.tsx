import { PERSONAL_INFO } from '../constants';
import { formatPostDate } from '../lib/utils';
import { Project } from '../types';
import { Arrow, Row, Section, TextLink } from './List';

const allProjects = `https://github.com/${PERSONAL_INFO.github}?tab=repositories`;

/** One line per project: title on the left, month on the right */
export function Projects({ projects, delay = 0 }: { projects: Project[]; delay?: number }) {
  return (
    <Section
      id="projects"
      title="projects"
      delay={delay}
      action={
        <a href={allProjects} target="_blank" rel="noreferrer" className="group text-muted hover:text-ink focus-visible:text-ink transition-colors">
          <span>all</span>
          <Arrow newTab />
        </a>
      }
    >
      {projects.length === 0 ? (
        <p className="text-muted">No projects listed yet.</p>
      ) : (
        <ol className="focus-index flex flex-col gap-1.5 max-[359.98px]:gap-2.5">
          {projects.map(project => (
            <li key={project.id} className="focus-item">
              <Row
                name={
                  <span className="focus-title">
                    <TextLink to={`/work/${project.id}`} arrow>{project.title}</TextLink>
                  </span>
                }
                detail={project.date && <time dateTime={project.date}>{formatPostDate(project.date).toLowerCase()}</time>}
              />
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
