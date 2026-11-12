import { useParams } from 'react-router-dom';

import { PROJECTS } from '../constants';
import { displayUrl } from '../lib/utils';
import { Article, ArticleSection } from './Article';
import { ProjectMedia } from './ProjectMedia';
import { Row, RowList, Section, TextLink } from './List';
import { NotFound } from './NotFound';
import { Projects } from './Projects';
import { SEO } from './SEO';

export function ProjectView() {
  const { slug } = useParams();
  const position = PROJECTS.findIndex(p => p.id === slug);
  const project = position >= 0 ? PROJECTS[position] : null;

  if (!project) return <NotFound />;

  const [summary, ...details] = project.description;
  const links = [
    project.demoUrl && { label: 'Live', url: project.demoUrl },
    project.link && { label: 'Source', url: project.link },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <>
      <SEO title={project.title} description={summary} path={`/work/${project.id}`} />

      <Article
        variant="case"
        index={`work / ${String(position + 1).padStart(2, '0')}`}
        title={
          <span className="flex items-center gap-3.5">
            {project.logo && (
              <img
                src={`${import.meta.env.BASE_URL}${project.logo}`}
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0"
              />
            )}
            {project.title}
          </span>
        }
        meta={project.tech.join(', ')}
      >
        {/* The lead: a measured result when there is one, then the first line of the write-up */}
        <div className="case-lead flex flex-col gap-3">
          {project.outcome && <p className="text-ink text-pretty">{project.outcome}</p>}
          <p className={`${project.outcome ? 'text-body' : 'text-ink'} text-pretty`}>{summary}</p>
        </div>

        {project.media && <ProjectMedia project={project} />}

        {details.length > 0 && (
          <ArticleSection title="What I built">
            <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-muted">
              {details.map(line => (
                <li key={line} className="pl-1 text-pretty">
                  <LeadIn line={line} />
                </li>
              ))}
            </ul>
          </ArticleSection>
        )}
      </Article>

      {links.length > 0 && (
        // Part of the case study, so its label matches "What I built"; the projects index below stays muted
        <div data-case>
          <Section title="Links" delay={120}>
            <RowList>
              {links.map(l => (
                <Row key={l.label} name={<TextLink to={l.url}>{displayUrl(l.url)}</TextLink>} detail={l.label} />
              ))}
            </RowList>
          </Section>
        </div>
      )}

      <Projects projects={PROJECTS.filter(p => p.id !== slug)} delay={160} />
    </>
  );
}

/**
 * A bullet written as "Designed the clover dial: hold ⌥ while…" reads with its lead-in in ink, so the
 * list can be scanned by what each line is about. Only lines with a short lead before a colon get one
 */
function LeadIn({ line }: { line: string }) {
  const at = line.indexOf(': ');
  if (at <= 0 || at > 48) return <>{line}</>;
  return (
    <>
      <span className="text-ink">{line.slice(0, at + 1)}</span>
      {line.slice(at + 1)}
    </>
  );
}
