import { Fragment, ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import { PROJECTS } from '../constants';
import { sinceWords, useLastPush } from '../lib/github';
import { displayUrl } from '../lib/utils';
import { Project } from '../types';
import { Article, ArticleSection } from './Article';
import { Block } from './CaseProse';
import { TextLink } from './List';
import { hasModel, ProjectModel } from './models/ProjectModel';
import { NotFound } from './NotFound';
import { ProjectFilm } from './ProjectFilm';
import { Projects } from './Projects';
import { ProjectSpan } from './ProjectSpan';
import { SEO } from './SEO';

const number = (i: number) => String(i + 1).padStart(2, '0');

/** A URL that may wrap only after a slash, never mid-word ("github.com/mithunreddyy/<wbr>nook") */
const url = (link: string) =>
  displayUrl(link)
    .split('/')
    .map((part, i, all) => (
      <Fragment key={i}>
        {part}
        {i < all.length - 1 && (
          <>
            /<wbr />
          </>
        )}
      </Fragment>
    ));

/**
 * A case study, kept like a lab notebook: a dateline under the name, the result and what it is, the film,
 * the model to try, the write-up in numbered chapters, and the details and sources last
 */
export function ProjectView() {
  const { slug } = useParams();
  const position = PROJECTS.findIndex(p => p.id === slug);
  const project = position >= 0 ? PROJECTS[position] : null;

  if (!project) return <NotFound />;

  // The write-up's own sections, in order
  const sections: { id: string; title: string; body: ReactNode }[] = project.sections.map(section => ({
    id: section.id,
    title: section.title,
    body: section.blocks.map((block, j) => <Block key={j} block={block} />),
  }));
  sections.push({ id: 'details', title: 'Details', body: <Details project={project} /> });
  if (hasModel(project.id)) sections.unshift({ id: 'try-it', title: 'Try it', body: <ProjectModel id={project.id} title={project.title} /> });

  return (
    <>
      <SEO title={project.title} description={project.intro || project.summary} path={`/work/${project.id}`} />

      <Article
        variant="case"
        index={`work / ${number(position)}`}
        toc={sections.map((c, i) => ({ id: c.id, label: `${number(i)} ${c.title}` }))}
        // Centred like a product's own page: the icon, the name, what it is, then when it ran
        title={
          <span className="case-title">
            {project.logo && (
              <img
                src={`${import.meta.env.BASE_URL}${project.logo}`}
                alt=""
                width={56}
                height={56}
                className="case-logo"
              />
            )}
            {project.title}
          </span>
        }
        meta={
          <>
            <span className="case-summary">{project.summary}</span>
            <span className="case-dateline">
              <ProjectSpan project={project} />
              {project.link && (
                <>
                  {', on '}
                  <TextLink to={project.link}>GitHub</TextLink>
                </>
              )}
            </span>
          </>
        }
      >
        {/* The lead: a measured result when there is one, then what it is */}
        <div className="case-lead flex flex-col gap-3">
          {project.outcome && <p className="text-ink">{project.outcome}</p>}
          {project.intro && <p className={project.outcome ? 'text-body' : 'text-ink'}>{project.intro}</p>}
        </div>

        {project.media && <ProjectFilm project={project} />}

        {sections.map((section, i) => (
          <ArticleSection key={section.id} id={section.id} title={<Chapter n={i}>{section.title}</Chapter>}>
            {section.body}
          </ArticleSection>
        ))}
      </Article>

      <Projects projects={PROJECTS.filter(p => p.id !== slug)} delay={160} />
    </>
  );
}

/** The facts a reader looks up rather than reads, then the sources the write-up cites */
function Details({ project }: { project: Project }) {
  const sheet: { label: string; value: ReactNode }[] = [
    ...project.facts,
    project.tech.length > 0 && { label: 'Built with', value: project.tech.join(', ') },
    project.demoUrl && { label: 'Live', value: <TextLink to={project.demoUrl}>{url(project.demoUrl)}</TextLink> },
    project.link && { label: 'Source', value: <Source link={project.link} /> },
  ].filter(Boolean) as { label: string; value: ReactNode }[];

  return (
    <>
      <dl className="case-sheet">
        {sheet.map(row => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {project.notes.length > 0 && (
        <ol className="case-sources" aria-label="Sources">
          <li className="case-sources-label" aria-hidden="true">
            Sources
          </li>
          {project.notes.map((note, i) => (
            <li key={note.url} id={`source-${i + 1}`}>
              <span className="case-sources-n tabular-nums">{i + 1}</span>
              <TextLink to={note.url}>{note.text}</TextLink>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/** A chapter label: its number in muted figures, then the title */
function Chapter({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="case-chapter">
      <span className="case-chapter-n tabular-nums" aria-hidden="true">
        {number(n)}
      </span>
      {children}
    </span>
  );
}

/** "Source" with when the repo last changed, once GitHub answers, however long ago that was */
function Source({ link }: { link: string }) {
  const pushed = useLastPush(link);
  return (
    <>
      <TextLink to={link}>{url(link)}</TextLink>
      {pushed && (
        <span className="text-muted">
          , updated <time dateTime={pushed.toISOString()}>{sinceWords(pushed)}</time>
        </span>
      )}
    </>
  );
}
