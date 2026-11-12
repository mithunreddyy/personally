import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from 'react';

import { Colors, readColors } from './draw';

export interface StageGame {
  /** The one input: a press. Hold games also use release; tap games can ignore it */
  press(): void;
  release(): void;
  /** The press was lost (scroll started, tab hidden, window blurred) and must not count as a release */
  cancel(): void;
  /** Advance the game by dt seconds; return true while it still needs frames */
  frame(dt: number, now: number): boolean;
  /** Draw the current state onto a cleared canvas, in CSS pixels */
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, colors: Colors, now: number): void;
}

// Space plays only when at least this much of the stage is on screen
const KEY_VISIBLE = 0.4;

/**
 * The canvas, loop and input every game shares. The loop runs only while the game asks for frames and
 * the stage is on screen. Input is a press and a release, from the pointer on the stage, the Space keycap
 * button, Enter on either of them, or Space anywhere on the page while the stage is in view, unless a
 * text field or a control outside the games section has focus.
 */
export function useStage(game: StageGame) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const keyRef = useRef<HTMLButtonElement>(null);
  const handlers = useRef(game);
  handlers.current = game;
  const [pressed, setPressed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const st = useRef({
    raf: 0,
    last: 0,
    visible: true,
    ratio: 0,
    width: 0,
    height: 0,
    colors: null as Colors | null,
    holding: null as 'pointer' | 'key' | null,
  });

  const paint = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const s = st.current;
    if (!canvas || !ctx || !s.width) return;
    const colors = (s.colors ??= readColors());
    const dpr = canvas.width / s.width;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, s.width, s.height);
    handlers.current.draw(ctx, s.width, s.height, colors, now);
  }, []);

  const loop = useCallback(
    (now: number) => {
      const s = st.current;
      s.raf = 0;
      const dt = Math.min(0.05, (now - (s.last || now)) / 1000);
      s.last = now;
      const more = handlers.current.frame(dt, now);
      paint(now);
      if (more && s.visible) s.raf = requestAnimationFrame(loop);
      else s.last = 0;
    },
    [paint],
  );

  const run = useCallback(() => {
    const s = st.current;
    if (!s.raf && s.visible) s.raf = requestAnimationFrame(loop);
  }, [loop]);

  const down = useCallback(
    (via: 'pointer' | 'key') => {
      const s = st.current;
      if (s.holding) return;
      s.holding = via;
      setPressed(true);
      handlers.current.press();
      run();
    },
    [run],
  );

  const up = useCallback(() => {
    const s = st.current;
    if (!s.holding) return;
    s.holding = null;
    setPressed(false);
    handlers.current.release();
    run();
  }, [run]);

  const cancel = useCallback(() => {
    const s = st.current;
    if (!s.holding) return;
    s.holding = null;
    setPressed(false);
    handlers.current.cancel();
    run();
  }, [run]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext('2d')) {
      setUnsupported(true);
      return;
    }
    const s = st.current;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.width = canvas.clientWidth;
      s.height = canvas.clientHeight;
      canvas.width = Math.round(s.width * dpr);
      canvas.height = Math.round(s.height * dpr);
      paint(performance.now());
    };
    const sizer = new ResizeObserver(resize);
    sizer.observe(canvas);

    // Off screen the loop stops; whatever was moving carries on when it comes back
    const seen = new IntersectionObserver(
      ([entry]) => {
        s.visible = entry.isIntersecting;
        s.ratio = entry.intersectionRatio;
        if (s.visible) run();
      },
      { threshold: [0, KEY_VISIBLE, 1] },
    );
    seen.observe(canvas);

    // The theme toggle swaps the tokens, so the drawing picks up the new ink
    const theme = new MutationObserver(() => {
      s.colors = readColors();
      paint(performance.now());
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    // Space anywhere plays the game in view, unless another control has focus or a dialog is open,
    // so the page still scrolls with Space everywhere else
    const spaceIsOurs = () => {
      if (s.ratio < KEY_VISIBLE || document.querySelector('[role="dialog"]')) return false;
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return true;
      if (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return false;
      // Anything in the games section, the game picker included, hands Space to the game: clicking a
      // game's name and then pressing Space should play it, not pick it again
      if (buttonRef.current?.closest('section')?.contains(active)) return true;
      // Elsewhere, Space keeps its job on buttons and toggles; on a link it does nothing anyway
      return !active.closest('button, [role="button"], summary, [role="checkbox"], [role="switch"]');
    };
    const isSpace = (e: globalThis.KeyboardEvent) => e.code === 'Space' || e.key === ' ';
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isSpace(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (s.holding === 'key') {
        e.preventDefault();
        return;
      }
      if (e.repeat || !spaceIsOurs()) return;
      e.preventDefault();
      down('key');
    };
    const onKeyUp = (e: globalThis.KeyboardEvent) => {
      if (!isSpace(e) || s.holding !== 'key') return;
      e.preventDefault();
      up();
    };
    const onHidden = () => document.hidden && cancel();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onHidden);

    paint(performance.now());
    run();
    return () => {
      sizer.disconnect();
      seen.disconnect();
      theme.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onHidden);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [cancel, down, paint, run, up]);

  // Pointer and Enter handlers, spread onto both the stage and the Space keycap button
  const holdProps = {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      down('pointer');
    },
    onPointerUp: () => st.current.holding === 'pointer' && up(),
    onPointerCancel: cancel,
    onLostPointerCapture: () => st.current.holding === 'pointer' && up(),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!e.repeat) down('key');
    },
    onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (st.current.holding === 'key') up();
    },
    onContextMenu: (e: { preventDefault(): void }) => e.preventDefault(),
  };

  return {
    canvasRef,
    buttonRef,
    keyRef,
    pressed,
    unsupported,
    holdProps,
    run,
    /** Current stage size in CSS pixels, for cameras */
    view: st.current,
    focus: () => buttonRef.current?.focus(),
  };
}

export type Stage = ReturnType<typeof useStage>;
