import { MotionConfig } from 'motion/react';
import { Suspense, lazy, useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { Blog } from './components/Blog';
import { Connect } from './components/Connect';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Hero } from './components/Hero';
import { Projects } from './components/Projects';
import { SEO } from './components/SEO';
import { Shell } from './components/Shell';
import { VisitCount } from './components/VisitCount';
import { usePortfolioData } from './hooks/usePortfolioData';
import { scrollToSection } from './lib/utils';

// Reading pages load on demand
const BlogPostView = lazy(() => import('./components/BlogPostView').then(module => ({ default: module.BlogPostView })));
const ProjectView = lazy(() => import('./components/ProjectView').then(module => ({ default: module.ProjectView })));
const CvView = lazy(() => import('./components/CvView').then(module => ({ default: module.CvView })));
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
      <Projects projects={projects} delay={160} />
      <Blog blogs={blogs} delay={200} showFeed />
      <Connect personalInfo={personalInfo} delay={240} />
      <VisitCount delay={280} />
    </>
  );
}

export default function App() {
  return (
    // "user" honors the OS reduced-motion setting for every Motion animation
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <Router basename={import.meta.env.BASE_URL}>
          <div className="min-h-screen bg-bg text-ink relative selection:bg-accent/20 selection:text-ink">
            <Shell>
              <Suspense fallback={<p className="text-muted" role="status">Loading the page</p>}>
                <Routes>
                  <Route path="/" element={<Portfolio />} />
                  <Route path="/cv" element={<CvView />} />
                  <Route path="/work/:slug" element={<ProjectView />} />
                  <Route path="/blog/:slug" element={<BlogPostView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Shell>
          </div>
        </Router>
      </ErrorBoundary>
    </MotionConfig>
  );
}

