import { useSyncExternalStore } from 'react';

const subscribe = (change: () => void) => {
  window.addEventListener('online', change);
  window.addEventListener('offline', change);
  return () => {
    window.removeEventListener('online', change);
    window.removeEventListener('offline', change);
  };
};

/** Whether the browser has a connection. The prerendered page assumes it does */
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
