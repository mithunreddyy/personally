import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
// Browser chrome (mobile address bar) follows the page background
const THEME_COLOR: Record<Theme, string> = { dark: '#040404', light: '#f6f7f9' };
const listeners = new Set<() => void>();

// Dark is the default; only an explicit earlier choice of light overrides it
function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

// One shared store, so every consumer (dock, command palette) sees the same theme.
let currentTheme: Theme = readStoredTheme();
if (typeof document !== 'undefined') {
  applyTheme(currentTheme);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
  try {
    localStorage.setItem(STORAGE_KEY, currentTheme);
  } catch {
    // Storage blocked (private window): the theme still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => currentTheme, () => 'dark' as Theme);
  return { theme, toggleTheme };
}
