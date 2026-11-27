// The pages opened in this visit, in sessionStorage, for the plan's footprints (Plan.tsx). Session only:
// it ends with the tab, is never sent anywhere, and is empty in a new visit
const KEY = 'plan:visited';

export function visitedPaths(): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((path): path is string => typeof path === 'string') : [];
  } catch {
    return [];
  }
}

export function recordVisit(path: string) {
  try {
    const paths = visitedPaths();
    if (!paths.includes(path)) sessionStorage.setItem(KEY, JSON.stringify([...paths, path]));
  } catch {
    // Storage blocked: the plan simply shows no footprints
  }
}
