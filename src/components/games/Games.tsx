import { Component, ComponentType, ReactNode, Suspense, lazy, useEffect, useRef, useState, useTransition } from 'react';

import { Section } from '../List';

// Each game loads on demand, so the page carries only the one in play
const GAMES: { id: string; name: string; load: () => Promise<{ default: ComponentType }> }[] = [
  { id: 'freekick', name: 'Free kick', load: () => import('./FreeKick') },
  { id: 'keepyuppy', name: 'Keepy-uppy', load: () => import('./KeepyUppy') },
  { id: 'hurdles', name: 'Hurdles', load: () => import('./Hurdles') },
  { id: 'kite', name: 'Kite', load: () => import('./Kite') },
];
const PICK_KEY = 'games-pick';

/**
 * A game's code, fetched with one quiet retry. If it still fails, the file has most likely gone: a tab
 * left open across a deploy asks for the old build's file, or the dev server re-bundled. One fresh page
 * load fixes that, so the page reloads itself, once per session per game, so a real outage can't loop
 */
function loadGame(id: string, load: () => Promise<{ default: ComponentType }>) {
  const flag = `games-reloaded-${id}`;
  return () =>
    load()
      .catch(() => new Promise(resolve => window.setTimeout(resolve, 600)).then(load))
      .then(module => {
        try {
          window.sessionStorage.removeItem(flag);
        } catch {
          // Storage blocked: nothing to clear
        }
        return module;
      })
      .catch(error => {
        try {
          if (!window.sessionStorage.getItem(flag)) {
            window.sessionStorage.setItem(flag, '1');
            window.location.reload();
            return new Promise<never>(() => {});
          }
        } catch {
          // Storage blocked: show the failure rather than risk reloading in a loop
        }
        throw error;
      });
}

// lazy() remembers a failed load for good, so a game that failed is given a fresh loader before retrying
const VIEWS: Record<string, ReturnType<typeof lazy>> = {};
const viewFor = (id: string) => {
  const game = GAMES.find(entry => entry.id === id) ?? GAMES[0];
  return (VIEWS[game.id] ??= lazy(loadGame(game.id, game.load)));
};
const forget = (id: string) => {
  delete VIEWS[id];
};

/** One game failing to load or draw leaves the rest of the page and the picker working */
class GameBoundary extends Component<{ id: string; name: string; onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // The next pick of this game starts from a fresh loader instead of the failed one
    forget(this.props.id);
    console.error(`[games] ${this.props.name} failed`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="text-muted" role="status">
        {this.props.name} didn’t load.{' '}
        <button type="button" className="link-line" onClick={this.props.onRetry}>
          Try again
        </button>
      </p>
    );
  }
}

/** Four one-button games in the walker's lines, one on the stage at a time */
export function Games({ delay = 0 }: { delay?: number }) {
  // Free kick first on every render the server makes; a visitor's last pick comes back after mount
  const [pick, setPick] = useState(GAMES[0].id);
  // The picker follows a click at once; the stage keeps the current game until the next one has loaded
  // (a transition), so the section never drops to a shorter loading line and jolts the page
  const [chosen, setChosen] = useState(pick);
  const [, startSwitch] = useTransition();
  const holder = useRef<HTMLDivElement>(null);
  // Bumped by "Try again", so the failed game remounts with a fresh loader
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PICK_KEY);
      if (saved && GAMES.some(game => game.id === saved)) {
        setPick(saved);
        setChosen(saved);
      }
    } catch {
      // Storage blocked: start on the first game
    }
  }, []);

  // The games sit near the end of the page, so a shorter game (its rules run to fewer lines) would make
  // the browser pull the scroll back and the section would slide down. The block only ever grows, at
  // each width, so switching games never moves it
  useEffect(() => {
    const el = holder.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = 0;
    let tallest = 0;
    const fit = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        tallest = 0;
        el.style.minHeight = '';
      }
      const height = el.getBoundingClientRect().height;
      if (height > tallest) {
        tallest = height;
        el.style.minHeight = `${height}px`;
      }
    });
    fit.observe(el);
    return () => fit.disconnect();
  }, []);

  const choose = (id: string) => {
    setChosen(id);
    startSwitch(() => setPick(id));
    try {
      window.localStorage.setItem(PICK_KEY, id);
    } catch {
      // Storage blocked: the pick lasts for this visit
    }
  };

  const game = GAMES.find(entry => entry.id === pick) ?? GAMES[0];
  const View = viewFor(game.id);

  return (
    <Section id="games" title="games" delay={delay}>
      <div className="games-picker flex flex-wrap gap-x-5" role="group" aria-label="Choose a game">
        {GAMES.map(entry => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === chosen}
            onClick={() => choose(entry.id)}
            className={entry.id === chosen ? 'text-ink' : 'text-muted hover:text-ink focus-visible:text-ink transition-colors'}
          >
            <span className={entry.id === chosen ? 'link-line games-picked' : ''}>{entry.name}</span>
          </button>
        ))}
      </div>

      <div ref={holder}>
        <Suspense
          fallback={
            <div className="game flex flex-col gap-2">
              <span className="text-muted">&nbsp;</span>
              <div className="game-stage grid place-items-center text-muted" role="status">
                Loading {game.name}
              </div>
            </div>
          }
        >
          {/* Inside the one Suspense, so a switch keeps the current game up while the next loads */}
          <GameBoundary key={`${game.id}-${attempt}`} id={game.id} name={game.name} onRetry={() => setAttempt(n => n + 1)}>
            <View />
          </GameBoundary>
        </Suspense>
      </div>
    </Section>
  );
}
