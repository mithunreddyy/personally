import { useState } from 'react';

import { add, capacity, Frame, frames, LayoutKind, relayout, remove, SCREEN, Screen } from '../../lib/models/nook';

const KINDS: { id: LayoutKind; name: string }[] = [
  { id: 'grid', name: 'Grid' },
  { id: 'columns', name: 'Columns' },
  { id: 'rows', name: 'Rows' },
  { id: 'side', name: 'Side' },
];
const MOST = 8;

/** Where a frame sits, in words: "the left half", "the top right", "a column on the right" */
function where(f: Frame) {
  const wide = f.width / SCREEN.width;
  const tall = f.height / SCREEN.height;
  const side = f.x + f.width / 2 < SCREEN.width / 2 ? 'left' : 'right';
  const end = f.y + f.height / 2 < SCREEN.height / 2 ? 'top' : 'bottom';
  if (wide > 0.9 && tall > 0.9) return 'the whole screen';
  if (tall > 0.9) return wide > 0.45 ? `the ${side} half` : `a column on the ${side}`;
  if (wide > 0.9) return tall > 0.45 ? `the ${end} half` : `a row at the ${end}`;
  return `the ${end} ${side}`;
}

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

/**
 * nook's rule, playable: open windows and watch each one take its place, close one and watch the rest fill
 * in. The layouts, the stacking and the refill are nook's own (src/lib/models/nook.ts)
 */
export function NookModel() {
  const [screen, setScreen] = useState<Screen>({ kind: 'grid', tiles: [[1]], active: 0 });
  const [next, setNext] = useState(2);
  const [said, setSaid] = useState('One window fills the screen.');

  const count = screen.tiles.flat().length;
  const placed = frames(screen.kind, screen.tiles.length);
  const kindName = KINDS.find(k => k.id === screen.kind)!.name;

  const open = () => {
    const after = add(screen, next);
    const at = after.tiles.findIndex(t => t[t.length - 1] === next);
    if (after.tiles.length > screen.tiles.length) {
      setSaid(`Window ${next} took ${where(frames(after.kind, after.tiles.length)[at])}.`);
    } else {
      const under = screen.tiles[at][screen.tiles[at].length - 1];
      setSaid(`${kindName} holds ${capacity(screen.kind)} here, so window ${next} stacked on window ${under}.`);
    }
    setScreen(after);
    setNext(n => n + 1);
  };

  const close = (window: number) => {
    const after = remove(screen, window);
    // Its tile emptied, yet the count held: a stacked window came out to fill the room
    const emptied = screen.tiles.some(t => t.length === 1 && t[0] === window);
    const refilled = emptied && after.tiles.length === screen.tiles.length;
    const returned = refilled ? after.tiles[after.tiles.length - 1][0] : null;
    const stack = screen.tiles.find(t => t.length > 1 && t[t.length - 1] === window);
    setSaid(
      after.tiles.length === 0
        ? 'No windows open.'
        : stack
          ? `Window ${window} closed. Window ${stack[stack.length - 2]} was under it.`
          : returned !== null
            ? `Window ${window} closed. Window ${returned} came out of its stack to take the space.`
            : `Window ${window} closed, and the rest filled its space.`,
    );
    setScreen(after);
  };

  const pick = (kind: LayoutKind) => {
    if (kind === screen.kind) return;
    const after = relayout(screen, kind);
    const name = KINDS.find(k => k.id === kind)!.name;
    const stacked = after.tiles.some(t => t.length > 1);
    setSaid(`${name} holds ${capacity(kind)} windows here.${stacked ? ' The rest wait in stacks.' : ''}`);
    setScreen(after);
  };

  return (
    <div className="model">
      <div className="model-controls">
        <button type="button" className="film-word" onClick={open} disabled={count >= MOST}>
          <span className="link-line">Open a window</span>
        </button>
        <span className="model-words" role="group" aria-label="Layout">
          {KINDS.map(k => (
            <button
              key={k.id}
              type="button"
              className="film-word model-word"
              aria-pressed={screen.kind === k.id}
              onClick={() => pick(k.id)}
            >
              {k.name}
            </button>
          ))}
        </span>
      </div>

      <div className="nook-screen" role="group" aria-label={`A 1440 by 900 screen with ${count} ${count === 1 ? 'window' : 'windows'}`}>
        <div className="nook-area">
        {screen.tiles.map((tile, i) => {
          const showing = tile[tile.length - 1];
          const f = placed[i];
          return (
            <div
              key={showing}
              className="nook-window"
              data-active={i === screen.active || undefined}
              style={{
                left: pct(f.x, SCREEN.width),
                top: pct(f.y, SCREEN.height),
                width: pct(f.width, SCREEN.width),
                height: pct(f.height, SCREEN.height),
              }}
            >
              {/* Choosing a window makes its tile the one extra windows stack onto, as in nook */}
              <button
                type="button"
                className="nook-title"
                aria-pressed={i === screen.active}
                aria-label={`Window ${showing}${tile.length > 1 ? `, ${tile.length - 1} more stacked under it` : ''}, ${where(f)}`}
                onClick={() => setScreen(s => ({ ...s, active: i }))}
              >
                Window {showing}
                {tile.length > 1 && <span className="text-muted"> +{tile.length - 1}</span>}
              </button>
              <button type="button" className="nook-close" aria-label={`Close window ${showing}`} onClick={() => close(showing)}>
                <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true">
                  <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
        {count === 0 && <p className="nook-empty text-muted">No windows. Open one to start.</p>}
        </div>
      </div>

      <p className="model-said" aria-live="polite">
        {said}
      </p>
      <p className="text-muted">
        These are nook’s own layout trees and stacking rules from its Swift source, ported to TypeScript, on a
        1440 by 900 screen with the main window at half.
      </p>
    </div>
  );
}
