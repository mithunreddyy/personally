import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://mithun.fyi';

interface SEOProps {
  title?: string;
  description?: string;
  /** Path relative to the site root, e.g. "/blog/my-post" */
  path?: string;
  type?: string;
  image?: string;
  schema?: object;
}

/** Builds a Person JSON-LD block for the home page */
function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Mithun Reddy Sudireddy',
    url: SITE_URL,
    jobTitle: 'Full-Stack Software Engineer',
    sameAs: [
      'https://github.com/mithunreddyy',
      'https://linkedin.com/in/mithunreddyyy',
    ],
  };
}

export function SEO({
  title = 'Mithun Reddy',
  description = 'Full-Stack Software Engineer ',
  path = '/',
  type = 'website',
  image = `${SITE_URL}/og-image.png`,
  schema,
}: SEOProps) {
  const siteTitle = title.includes('Mithun Reddy') ? title : `${title} | Mithun Reddy`;
  const canonical = `${SITE_URL}${path}`;

  // On the home page, inject Person structured data alongside any page-level schema
  const isHome = path === '/';
  const schemas: object[] = [];
  if (isHome) schemas.push(personSchema());
  if (schema) schemas.push(schema);

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonical} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}

      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
