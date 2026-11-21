import { formatPostDate } from '../lib/utils';
import { Project } from '../types';

/** The month a project started, in lowercase ("nov 2026"), from the `date` in its frontmatter */
export function ProjectSpan({ project }: { project: Project }) {
  if (!project.date) return null;
  return (
    <time dateTime={project.date} className="tabular-nums whitespace-nowrap">
      {formatPostDate(project.date).toLowerCase()}
    </time>
  );
}
