import { Component, ComponentType, ReactNode, Suspense, lazy, useEffect, useState } from 'react';

import { Section } from '../List';

// Each game loads on demand, so the page carries only the one in play
const GAMES: { id: string; name: string; shape?: 'wide' | 'tall'; load: () => Promise<{ default: ComponentType }> }[] = [
  { id: 'freekick', name: 'Free kick', shape: 'wide', load: () => import('./FreeKick') },
  { id: 'keepyuppy', name: 'Keepy-uppy', shape: 'tall', load: () => import('./KeepyUppy') },
  { id: 'hurdles', name: 'Hurdles', load: () => import('./Hurdles') },
  { id: 'kite', name: 'Kite', shape: 'tall', load: () => import('./Kite') },
];
const VIEWS = Object.fromEntries(GAMES.map(game => [game.id, lazy(game.load)]));
const PICK_KEY = 'games-pick';

/** One game failing to load or draw leaves the rest of the page and the picker working */
class GameBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="text-muted">
        {this.props.name} didn’t load.{' '}
        <button type="button" className="link-line" onClick={() => window.location.reload()}>
          Reload the page
        </button>{' '}
        to try again.
      </p>
    );
  }
}

/** Four one-button games in the walker's lines, one on the stage at a time */
export function Games({ delay = 0 }: { delay?: number }) {
  // Free kick first on every render the server makes; a visitor's last pick comes back after mount
  const [pick, setPick] = useState(GAMES[0].id);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PICK_KEY);
      if (saved && VIEWS[saved]) setPick(saved);
    } catch {
      // Storage blocked: start on the first game
    }
  }, []);

  const choose = (id: string) => {
    setPick(id);
    try {
      window.localStorage.setItem(PICK_KEY, id);
    } catch {
      // Storage blocked: the pick lasts for this visit
    }
  };

  const game = GAMES.find(entry => entry.id === pick) ?? GAMES[0];
  const View = VIEWS[game.id];

  return (
    <Section id="games" title="games" delay={delay}>
      <div className="games-picker flex flex-wrap gap-x-5" role="group" aria-label="Choose a game">
        {GAMES.map(entry => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === pick}
            onClick={() => choose(entry.id)}
            className={entry.id === pick ? 'text-ink' : 'text-muted hover:text-ink focus-visible:text-ink transition-colors'}
          >
            <span className={entry.id === pick ? 'link-line games-picked' : ''}>{entry.name}</span>
          </button>
        ))}
      </div>

      <GameBoundary key={game.id} name={game.name}>
        <Suspense
          fallback={
            <div className="game flex flex-col gap-2">
              <span className="text-muted">&nbsp;</span>
              <div className={`game-stage${game.shape ? ` game-stage-${game.shape}` : ''} grid place-items-center text-muted`} role="status">
                Loading {game.name}
              </div>
            </div>
          }
        >
          <View />
        </Suspense>
      </GameBoundary>
    </Section>
  );
}
