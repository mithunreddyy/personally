import { Fragment, ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import { PROJECTS } from '../constants';
import { sinceWords, useLastPush } from '../lib/github';
import { displayUrl, formatPostDate } from '../lib/utils';
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
 * the model to try, the write-up in numbered chapters (with its timeline), and the details and sources last
 */
export function ProjectView() {
  const { slug } = useParams();
  const position = PROJECTS.findIndex(p => p.id === slug);
  const project = position >= 0 ? PROJECTS[position] : null;

  if (!project) return <NotFound />;

  // The write-up's own sections, with the timeline before the limits (or last, when there are none)
  const sections: { id: string; title: string; body: ReactNode }[] = project.sections.map(section => ({
    id: section.id,
    title: section.title,
    body: section.blocks.map((block, j) => <Block key={j} block={block} />),
  }));
  if (project.timeline.length > 1) {
    const limits = sections.findIndex(s => s.id === 'what-it-doesn-t-do');
    sections.splice(limits >= 0 ? limits : sections.length, 0, {
      id: 'timeline',
      title: 'Timeline',
      body: <Timeline project={project} />,
    });
  }
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

/**
 * The repo's history as posts along a path: dated commits from its log, then, once GitHub answers, when it
 * last changed. Without the worker the live post is simply left off
 */
function Timeline({ project }: { project: Project }) {
  const pushed = useLastPush(project.link);
  const latest = project.timeline[project.timeline.length - 1].date;
  const posts = [
    ...project.timeline.map(t => ({ key: `${t.date}-${t.event}`, date: t.date, when: formatPostDate(t.date, 'day'), event: t.event })),
    // Only when it moved after the last milestone listed, so the path never runs backwards
    ...(pushed && pushed.toISOString().slice(0, 10) > latest
      ? [{ key: 'latest', date: pushed.toISOString(), when: sinceWords(pushed), event: 'Last change to the repo' }]
      : []),
  ];
  return (
    <ol className="case-timeline">
      {posts.map(post => (
        <li key={post.key}>
          <time dateTime={post.date}>{post.when}</time>
          <span>{post.event}</span>
        </li>
      ))}
    </ol>
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
