import { PERSONAL_INFO } from '../constants';
import { Project } from '../types';
import { Arrow, Section, TextLink } from './List';

const allProjects = `https://github.com/${PERSONAL_INFO.github}?tab=repositories`;

/** Title and one muted line per project */
export function Projects({ projects, delay = 0 }: { projects: Project[]; delay?: number }) {
  return (
    <Section
      id="projects"
      title="Projects"
      delay={delay}
      action={
        <a href={allProjects} target="_blank" rel="noreferrer" className="group text-muted hover:text-ink focus-visible:text-ink transition-colors">
          <span>All</span>
          <Arrow newTab />
        </a>
      }
    >
      {projects.length === 0 ? (
        <p className="text-muted">No projects listed yet.</p>
      ) : (
        <ol className="focus-index flex flex-col gap-4">
          {projects.map(project => (
            <li key={project.id} className="focus-item">
              <span className="focus-title block">
                <TextLink to={`/work/${project.id}`} arrow>{project.title}</TextLink>
              </span>
              {project.summary && <p className="text-muted">{project.summary}</p>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
