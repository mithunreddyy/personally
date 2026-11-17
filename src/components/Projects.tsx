import { PERSONAL_INFO } from '../constants';
import { isRecent, sinceWords, useLastPush } from '../lib/github';
import { formatPostDate } from '../lib/utils';
import { Project } from '../types';
import { Arrow, Row, Section, TextLink } from './List';

const allProjects = `https://github.com/${PERSONAL_INFO.github}?tab=repositories`;

/**
 * The right column: "updated last week" while the repo has been pushed to in the last two months, so live
 * work reads as live; otherwise, and until GitHub answers, the project's month
 */
function ProjectWhen({ project }: { project: Project }) {
  const pushed = useLastPush(project.link);
  if (pushed && isRecent(pushed)) return <time dateTime={pushed.toISOString()}>updated {sinceWords(pushed)}</time>;
  return project.date ? <time dateTime={project.date}>{formatPostDate(project.date).toLowerCase()}</time> : null;
}

/** Each project: title on the left, month (or recent activity) on the right, and what it is in one muted line underneath */
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
                    <TextLink to={`/work/${project.id}`} arrow>{project.title}</TextLink>
                  </span>
                }
                detail={<ProjectWhen project={project} />}
              />
              {project.summary && <p className="text-muted text-pretty">{project.summary}</p>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
