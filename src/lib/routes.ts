// The reading pages' chunks. App.tsx lazy-loads them from here, and links warm them up on hover or focus,
// so a page change rarely has to wait on the network
export const loadBlogPost = () => import('../components/BlogPostView');
export const loadProject = () => import('../components/ProjectView');
export const loadCv = () => import('../components/CvView');

export function preloadRoute(to: string) {
  const load = to.startsWith('/blog/') ? loadBlogPost : to.startsWith('/work/') ? loadProject : to === '/cv' ? loadCv : null;
  // A failed warm-up is fine: the route's own lazy load retries and shows its error state
  load?.().catch(() => {});
}
