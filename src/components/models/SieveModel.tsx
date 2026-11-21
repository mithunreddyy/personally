import '@fontsource/geist-mono/latin-400.css';
import { useEffect, useRef, useState } from 'react';

import samples from '../../data/sieve-receipts.json';

const number = (n: number) => Math.round(n).toLocaleString('en-US');
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from one number to another over 0.5s, so the saving reads as it happens */
function useTween(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || still()) {
      from.current = target;
      setShown(target);
      return;
    }
    const began = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min((now - began) / 500, 1);
      const eased = 1 - (1 - t) ** 3;
      const value = start + (target - start) * eased;
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

/**
 * One real tool output, folded in place. It opens on what the model would read without Sieve; Fold swaps
 * it for the receipt sieve's own code made from it (scripts/sieve-receipts.ts), and the line under it
 * shrinks to the receipt's share of the tokens
 */
export function SieveModel() {
  const [id, setId] = useState(samples[0].id);
  const [folded, setFolded] = useState(false);
  const sample = samples.find(s => s.id === id) ?? samples[0];
  const tokens = useTween(folded ? sample.tokensOut : sample.tokensIn);
  const share = folded ? sample.tokensOut / sample.tokensIn : 1;
  const fewer = Math.round((1 - sample.tokensOut / sample.tokensIn) * 100);

  const pick = (next: string) => {
    setId(next);
    setFolded(false);
  };

  return (
    <div className="model">
      <span className="model-words" role="group" aria-label="Tool output">
        {samples.map(s => (
          <button
            key={s.id}
            type="button"
            className="film-word model-word"
            aria-pressed={s.id === id}
            onClick={() => pick(s.id)}
          >
            {s.id === 'repeats' ? 'No known format' : s.name}
          </button>
        ))}
      </span>

      <figure className="fold" data-folded={folded || undefined}>
        <figcaption className="fold-head">
          <span className="text-muted">{sample.command ? `$ ${sample.command}` : `${number(sample.lines)} lines`}</span>
          <span className="tabular-nums">{number(tokens)} tokens</span>
        </figcaption>
        {/* key: a fresh block per view, so the swap fades in rather than jumping */}
        <pre key={`${id}-${folded}`} className="fold-text" tabIndex={0} aria-label={folded ? 'Sieve’s receipt' : `${sample.name} output`}>
          {folded ? sample.receipt : sample.input}
        </pre>
        {/* The tokens to scale: full width for the output, the receipt's share once folded */}
        <div className="fold-meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${share})` }} />
        </div>
      </figure>

      <div className="model-controls">
        <button type="button" className="film-word" onClick={() => setFolded(f => !f)}>
          <span className="link-line">{folded ? 'Unfold' : 'Fold it with Sieve'}</span>
        </button>
        <p className="model-said" aria-live="polite">
          {folded
            ? `${fewer}% fewer tokens, each time the model rereads its context.`
            : `What the model reads without Sieve: all ${number(sample.lines)} lines.`}
        </p>
      </div>

      <p className="text-muted">
        {sample.id === 'repeats'
          ? 'The 320-line run from sieve’s README'
          : `A real ${sample.name} run (${sample.source}) from sieve’s test fixtures`}
        , folded by sieve’s own code (Apache-2.0). The receipt’s id expands back to the exact output.
      </p>
    </div>
  );
}
