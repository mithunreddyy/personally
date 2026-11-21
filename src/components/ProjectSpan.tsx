import { isRecent, useLastPush } from '../lib/github';
import { formatPostDate } from '../lib/utils';
import { Project } from '../types';

const month = (date: string | Date) => formatPostDate(typeof date === 'string' ? date : date.toISOString()).toLowerCase();

/**
 * When a project ran, as a range: "nov 2026 → now" while its repo has moved in the last two months,
 * "oct 2026 → nov 2026" once it has settled, and just the month until GitHub answers (or without the worker)
 */
export function ProjectSpan({ project }: { project: Project }) {
  const pushed = useLastPush(project.link);
  if (!project.date) return null;
  const start = month(project.date);
  const end = pushed ? (isRecent(pushed) ? 'now' : month(pushed)) : null;

  return (
    <span className="tabular-nums whitespace-nowrap">
      <time dateTime={project.date}>{start}</time>
      {end && end !== start && (
        <>
          {/* A range, read as "to"; the arrow is the notation, not decoration */}
          <span aria-label=" to "> → </span>
          {end === 'now' ? 'now' : <time dateTime={pushed!.toISOString()}>{end}</time>}
        </>
      )}
    </span>
  );
}
