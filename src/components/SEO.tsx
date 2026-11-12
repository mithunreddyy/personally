import { Helmet } from 'react-helmet-async';

import { PERSONAL_INFO } from '../constants';

export const SITE_URL = 'https://mithun.fyi';
const SITE_NAME = 'Mithun Reddy';

// The home page describes itself in the hero's own words (content/profile.md), so search results and
// link previews say what the page says
const firstName = PERSONAL_INFO.name.split(' ')[0];
export const SITE_DESCRIPTION = `I'm ${firstName}, ${PERSONAL_INFO.summary.trim()} I've worked across healthcare, finance, e-commerce, dev tools, and AI.`;

interface SEOProps {
  title?: string;
  description?: string;
  /** Path relative to the site root, e.g. "/blog/my-post" */
  path?: string;
  type?: string;
  image?: string;
  schema?: object;
  /** For pages that should stay out of search results, such as the 404 */
  noindex?: boolean;
}

const sameAs = [`https://github.com/${PERSONAL_INFO.github}`, `https://www.linkedin.com/in/${PERSONAL_INFO.linkedin}`];

/** Who the site is about, and the site itself: structured data for the home page */
function homeSchemas() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: PERSONAL_INFO.name,
      alternateName: SITE_NAME,
      url: SITE_URL,
      image: `${SITE_URL}/og-image.png`,
      jobTitle: PERSONAL_INFO.role,
      description: SITE_DESCRIPTION,
      sameAs,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'en',
      author: { '@id': `${SITE_URL}/#person` },
    },
  ];
}

export function SEO({
  title = SITE_NAME,
  description = SITE_DESCRIPTION,
  path = '/',
  type = 'website',
  image = `${SITE_URL}/og-image.png`,
  schema,
  noindex = false,
}: SEOProps) {
  const siteTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = `${SITE_URL}${path}`;

  const schemas: object[] = [];
  if (path === '/' && !noindex) schemas.push(...homeSchemas());
  if (schema) schemas.push(schema);

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'} />
      {!noindex && <link rel="canonical" href={canonical} />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={SITE_NAME} />
      {!noindex && <meta property="og:url" content={canonical} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
