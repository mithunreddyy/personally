import { Check, Hand } from 'lucide-react';
import { useEffect, useState } from 'react';

// A status pill at the top of the screen, in the spirit of the Dynamic Island: it confirms things that
// have no button of their own to show feedback on, like the M, T, D and V keyboard shortcuts.
// Anything can call announce(); the pill grows in, holds for a moment, and folds away.

// "done" confirms something happened (copied, switched); "hello" is a greeting, not a confirmation
type Tone = 'done' | 'hello';
type Listener = (message: string, tone: Tone) => void;
const listeners = new Set<Listener>();

export function announce(message: string, tone: Tone = 'done') {
  listeners.forEach(listener => listener(message, tone));
}

const HOLD_MS = 2200;
// Matches the island-out animation in index.css
const FOLD_MS = 260;

export function Island() {
  // `key` changes on every announcement, so the same message twice in a row still replays the pop
  const [state, setState] = useState<{ message: string; tone: Tone; key: number; folding?: boolean } | null>(null);

  useEffect(() => {
    const listener: Listener = (message, tone) => setState(prev => ({ message, tone, key: (prev?.key ?? 0) + 1 }));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const timer = state.folding
      ? window.setTimeout(() => setState(null), FOLD_MS)
      : window.setTimeout(() => setState({ ...state, folding: true }), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    // The live region is always in the page, so screen readers hear each message as it lands
    <div role="status" aria-live="polite" className="island-anchor print:hidden">
      {state && (
        <div key={state.key} className={`island${state.folding ? ' island-folding' : ''}`}>
          {state.tone === 'hello' ? (
            <Hand size={14} strokeWidth={2} aria-hidden="true" className="island-hand shrink-0" />
          ) : (
            <Check size={14} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
          )}
          <span>{state.message}</span>
        </div>
      )}
    </div>
  );
}
