import { MotionConfig } from 'motion/react';
import { ReactNode, Suspense, lazy, useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { Blog } from './components/Blog';
import { Connect } from './components/Connect';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Games } from './components/games/Games';
import { Hero } from './components/Hero';
import { Projects } from './components/Projects';
import { SEO } from './components/SEO';
import { Shell } from './components/Shell';
import { VisitCount } from './components/VisitCount';
import { usePortfolioData } from './hooks/usePortfolioData';
import { loadBlogPost, loadCv, loadProject } from './lib/routes';
import { scrollToSection } from './lib/utils';

// Reading pages load on demand; links warm the same chunks on hover (lib/routes.ts)
const BlogPostView = lazy(() => loadBlogPost().then(module => ({ default: module.BlogPostView })));
const ProjectView = lazy(() => loadProject().then(module => ({ default: module.ProjectView })));
const CvView = lazy(() => loadCv().then(module => ({ default: module.CvView })));
const NotFound = lazy(() => import('./components/NotFound').then(module => ({ default: module.NotFound })));

function Portfolio() {
  const { personalInfo, projects, blogs } = usePortfolioData();
  const location = useLocation();

  // The command menu can send people here from another page with a section to land on
  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (target) requestAnimationFrame(() => scrollToSection(target));
  }, [location.state]);

  return (
    <>
      <SEO />
      <Hero personalInfo={personalInfo} />
      {/* Everything below rides up over the hero on the page's own background */}
      <div className="home-over">
        <Projects projects={projects} delay={160} />
        <Blog blogs={blogs} delay={200} showFeed />
        <Games delay={240} />
        <Connect personalInfo={personalInfo} delay={280} />
        <VisitCount delay={320} />
      </div>
    </>
  );
}

/** Everything inside the router. The browser wraps it in BrowserRouter (App below); the build's
    prerender (src/entry-server.tsx) wraps the same tree in a StaticRouter, so both render identical markup */
export function Site({ router }: { router: (children: ReactNode) => ReactNode }) {
  return (
    // "user" honors the OS reduced-motion setting for every Motion animation
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        {router(
          <div className="min-h-screen bg-bg text-ink relative selection:bg-accent/20 selection:text-ink">
            <Shell>
              {/* data-route-loading tells a page change (lib/viewTransition.ts) the new page isn't in yet */}
              <Suspense fallback={<p className="text-muted" role="status" data-route-loading>Loading the page</p>}>
                <Routes>
                  <Route path="/" element={<Portfolio />} />
                  <Route path="/cv" element={<CvView />} />
                  <Route path="/work/:slug" element={<ProjectView />} />
                  <Route path="/blog/:slug" element={<BlogPostView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Shell>
          </div>,
        )}
      </ErrorBoundary>
    </MotionConfig>
  );
}

export default function App() {
  return <Site router={children => <Router basename={import.meta.env.BASE_URL}>{children}</Router>} />;
}
