import { useParams } from 'react-router-dom';

import { PROJECTS } from '../constants';
import { displayUrl } from '../lib/utils';
import { Article, ArticleSection } from './Article';
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
        index={`work / ${String(position + 1).padStart(2, '0')}`}
        title={project.title}
        meta={project.tech.join(', ')}
      >
        <ArticleSection>
          <p className="text-ink text-pretty">{summary}</p>
        </ArticleSection>

        {details.length > 0 && (
          <ArticleSection title="What I built">
            <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-muted">
              {details.map(line => (
                <li key={line} className="pl-1 text-pretty">
                  {line}
                </li>
              ))}
            </ul>
          </ArticleSection>
        )}
      </Article>

      {links.length > 0 && (
        <Section title="Links" delay={120}>
          <RowList>
            {links.map(l => (
              <Row key={l.label} name={<TextLink to={l.url}>{displayUrl(l.url)}</TextLink>} detail={l.label} />
            ))}
          </RowList>
        </Section>
      )}

      <Projects projects={PROJECTS.filter(p => p.id !== slug)} delay={160} />
    </>
  );
}
