import { PERSONAL_INFO } from '../constants';
import { Project } from '../types';
import { Arrow, Row, Section, TextLink } from './List';
import { ProjectSpan } from './ProjectSpan';

const allProjects = `https://github.com/${PERSONAL_INFO.github}?tab=repositories`;

/** Each project: title on the left, when it ran on the right, and what it is in one muted line underneath */
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
        <ol className="focus-index flex flex-col gap-3 max-[359.98px]:gap-3.5">
          {projects.map(project => (
            <li key={project.id} className="focus-item">
              <Row
                name={
                  <span className="focus-title">
                    <TextLink to={`/work/${project.id}`} arrow travel>{project.title}</TextLink>
                  </span>
                }
                detail={<ProjectSpan project={project} />}
              />
              {project.summary && <p className="text-muted text-pretty">{project.summary}</p>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
