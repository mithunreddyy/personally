import { useEffect, useRef, useState } from 'react';

import { LIVES, PIT_START, createRace, press, release, stepRace } from '../../lib/games/hurdles';
import { HIP, Pose, Pt, liveBest, makePen, reducedMotion, stridePose } from './draw';
import { GameShell } from './GameShell';
import { useStage } from './useStage';

// At least thirteen metres of track in view, never under 18.5px a metre
const MIN_SCALE = 18.5;
const VIEW = 13;
const STRIDE = 2.3;
// The best run is kept as a ghost: his position twenty times a second, raced against next time
const GHOST_KEY = 'games-ghost-hurdles';
const GHOST_STEP = 0.05;
const PIT_DEPTH = 0.35;

function readGhost(): Pt[] {
  try {
    const raw = window.localStorage.getItem(GHOST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(pt => Array.isArray(pt) && pt.length === 2) : [];
  } catch {
    return [];
  }
}

function saveGhost(samples: Pt[]) {
  try {
    window.localStorage.setItem(GHOST_KEY, JSON.stringify(samples.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])));
  } catch {
    // Storage blocked or full: no ghost next time, the game still plays
  }
}

/** Runs on his own; hold to jump. A tap is a hop, a hold goes higher */
export default function Hurdles() {
  const g = useRef({
    r: createRace(),
    best: liveBest('hurdles'),
    metres: -1,
    overShown: false,
    ghost: [] as Pt[],
    samples: [] as Pt[],
    splashAt: null as { t: number; x: number } | null,
  }).current;
  const [hud, setHud] = useState({
    metres: 0,
    cleared: 0,
    lives: LIVES,
    gap: null as number | null,
    best: null as number | null,
    line: '',
    over: false,
    started: false,
  });

  /** Where the ghost of the best run is at this moment of the race, or null if it has none or has finished */
  const ghostAt = (t: number): Pt | null => {
    const i = t / GHOST_STEP;
    const a = g.ghost[Math.floor(i)];
    const b = g.ghost[Math.floor(i) + 1];
    if (!a) return null;
    if (!b) return a;
    const k = i - Math.floor(i);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };

  const pushHud = (line?: string) => {
    const ghost = g.r.started && g.ghost.length ? ghostAt(g.r.t) : null;
    setHud(prev => ({
      metres: Math.floor(g.r.x),
      cleared: g.r.cleared,
      lives: g.r.lives,
      gap: ghost ? Math.round(g.r.x - ghost[0]) : null,
      best: g.best.value,
      line: line ?? prev.line,
      over: g.r.over,
      started: g.r.started,
    }));
  };

  function newRace() {
    g.r = createRace();
    g.best.begin();
    g.samples = [];
    g.splashAt = null;
    g.overShown = false;
    pushHud('');
    stage.run();
  }

  const stage = useStage({
    press() {
      const r = g.r;
      if (r.over) return newRace();
      // The first press only sets him off; after that every press is a jump
      if (!r.started) {
        r.started = true;
        pushHud('');
        return;
      }
      press(r);
    },
    release() {
      release(g.r);
    },
    cancel() {
      release(g.r);
    },
    frame(dt) {
      const r = g.r;
      const event = stepRace(r, dt);
      if (r.started && !r.over) {
        while (g.samples.length * GHOST_STEP <= r.t) g.samples.push([r.x, r.y]);
      }
      const lives = `${r.lives} ${r.lives === 1 ? 'life' : 'lives'} left`;
      if (event === 'clipped') pushHud(`Clipped one, ${lives}`);
      if (event === 'splash' || (event === 'over' && r.hurdles.some(h => h.splashed && !g.splashAt))) {
        g.splashAt = { t: r.t, x: r.x };
        if (event === 'splash') pushHud(`In the water, ${lives}`);
      }
      if (event === 'cleared' && g.best.offer(r.cleared)) pushHud('New best, keep going');
      if (r.over && !g.overShown) {
        g.overShown = true;
        // A new best run replaces the ghost
        if (g.best.passed || !g.ghost.length) {
          g.samples.push([r.x, r.y]);
          saveGhost(g.samples);
          g.ghost = g.samples;
        }
        pushHud(`Out after ${Math.floor(r.x)} m with ${r.cleared} cleared.${g.best.passed ? ' New best.' : ''}`);
      } else if (Math.floor(r.x / 5) !== Math.floor(g.metres / 5)) {
        // The distance in the meta line moves in five-metre steps, so it doesn't re-render every frame
        g.metres = r.x;
        pushHud();
      }
      const toppling = r.hurdles.some(h => h.hit !== null && h.fall < 1);
      const splashing = g.splashAt !== null && r.t - g.splashAt.t < 0.6;
      return (r.started && !r.over) || toppling || splashing;
    },
    draw(ctx, W, H, colors) {
      const r = g.r;
      // Frame by height (3.6 m: a high jump and the figure) so he is large on any stage, but keep at least
      // VIEW metres of track in sight so there is time to see what's coming
      const s = Math.max(MIN_SCALE, Math.min((H - 14) / 3.6, W / VIEW));
      const view = W / s;
      const left = r.x - view * 0.2;
      const p = makePen(ctx, colors, s, left, H - 12);
      const { X, Y, line } = p;
      p.grass(left, left + view);

      // Water pits: the ground opens after the barrier into a shallow pit with a rippled surface
      for (const h of r.hurdles) {
        if (!h.pit || h.x + h.pit < left - 1 || h.x > left + view + 1) continue;
        const a = h.x + PIT_START;
        const b = a + h.pit;
        ctx.fillStyle = colors.bg;
        ctx.fillRect(X(a), Y(0) - 1, (b - a) * s, PIT_DEPTH * s + 2);
        line([[a, 0], [a + 0.15, -PIT_DEPTH], [b - 0.15, -PIT_DEPTH], [b, 0]], colors.ink, 1);
        const wave: Pt[] = [];
        for (let x = a + 0.08; x <= b - 0.08; x += 0.2) wave.push([x, -0.1 + Math.sin(x * 6 + (reducedMotion() ? 0 : r.t * 4)) * 0.025]);
        line(wave, colors.muted, 1);
      }

      // The ghost of the best run, dashed and in muted, on his shoulder
      const ghost = g.ghost.length ? (r.started ? ghostAt(r.t) : g.ghost[0]) : null;
      if (ghost) {
        const finished = r.t / GHOST_STEP >= g.ghost.length - 1;
        ctx.setLineDash([2, 3]);
        const gp = ghost[1] > 0.02 ? stridePose(ghost[0], 0.25, { lift: 0, reachLen: 0.3 }) : stridePose(ghost[0], finished ? 0.25 : (ghost[0] / STRIDE) % 1, { lift: 0.3, reachLen: 0.48, arms: 0.45 });
        if (ghost[1] > 0.02) {
          gp.hip = [ghost[0], ghost[1] + HIP];
          gp.feet = [[ghost[0] + 0.72, ghost[1] + HIP - 0.08], [ghost[0] - 0.42, ghost[1] + HIP - 0.3]];
          gp.hands = [[ghost[0] + 0.55, ghost[1] + HIP + 0.45], [ghost[0] - 0.35, ghost[1] + HIP + 0.2]];
        }
        p.figure(gp, 0.5);
        ctx.setLineDash([]);
        // Where the best run ended: a small flag on the track
        const end = g.ghost[g.ghost.length - 1][0];
        if (end > left && end < left + view) {
          line([[end, 0], [end, 1.3]], colors.muted, 1);
          ctx.fillStyle = colors.muted;
          ctx.beginPath();
          ctx.moveTo(X(end), Y(1.3));
          ctx.lineTo(X(end + 0.4), Y(1.17));
          ctx.lineTo(X(end), Y(1.04));
          ctx.closePath();
          ctx.fill();
        }
      }

      // Hurdles: an upright with its foot running back along the track and the bar seen end on.
      // A clipped one topples forward about its foot
      for (const h of r.hurdles) {
        if (h.x < left - 1 || h.x > left + view + 1) continue;
        // Under reduced motion it lies down at once instead of toppling
        const angle = h.hit === null ? 0 : (reducedMotion() ? 1 : h.fall) * Math.PI * 0.46;
        const tip: [number, number] = [h.x + Math.sin(angle) * h.h, Math.cos(angle) * h.h];
        line([[h.x - 0.4, 0], [h.x, 0]], colors.ink, p.lw * 0.8);
        line([[h.x, 0], tip], colors.ink, p.lw * 0.8);
        ctx.fillStyle = colors.ink;
        ctx.fillRect(X(tip[0]) - p.lw * 1.4, Y(tip[1]) - p.lw * 0.9, p.lw * 2.8, p.lw * 1.8);
      }

      // Runner: the stride is tied to distance, so the planted foot never skids
      const phase = (r.x / STRIDE) % 1;
      let pose: Pose;
      const x = r.x;
      if (!r.started) {
        // Set position, low and leaning in
        pose = { hip: [x, HIP - 0.18], dir: 1, lean: 0.3, feet: [[x + 0.25, 0], [x - 0.35, 0]], hands: [[x + 0.35, 0.05], [x + 0.28, 0.06]] };
      } else if (r.over) {
        pose = { hip: [x, HIP], dir: 1, lean: 0.12, feet: [[x + 0.1, 0], [x - 0.1, 0]], hands: [[x + 0.15, 0.62], [x - 0.05, 0.6]] };
      } else if (!r.grounded) {
        // Hurdling form: lead leg straight out ahead, trail leg folded behind, opposite arm reaching
        const y = r.y;
        pose = {
          hip: [x, y + HIP],
          dir: 1,
          lean: 0.22,
          feet: [[x + 0.72, y + HIP - 0.08], [x - 0.42, y + HIP - 0.3]],
          hands: [[x + 0.55, y + HIP + 0.45], [x - 0.35, y + HIP + 0.2]],
        };
      } else {
        pose = stridePose(x, phase, { lift: 0.3, reachLen: 0.48, arms: 0.45 });
        if (r.stumble > 0) pose.lean = 0.3;
      }
      p.figure(pose);

      // A splash: drops thrown up and out from where he landed, falling back
      if (g.splashAt && !reducedMotion()) {
        const k = (r.t - g.splashAt.t) / 0.6;
        if (k < 1) {
          ctx.fillStyle = colors.ink;
          for (let i = 0; i < 7; i++) {
            const vx = (i - 3) * 0.5;
            const vy = 2.4 + (i % 3) * 0.5;
            const tt = k * 0.6;
            const px = g.splashAt.x + vx * tt;
            const py = Math.max(-0.1, vy * tt - 5 * tt * tt);
            ctx.beginPath();
            ctx.arc(X(px), Y(py), Math.max(1.2, 0.035 * s), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    },
  });

  useEffect(() => {
    g.best.load();
    g.ghost = readGhost();
    pushHud();
    // Runs once on mount; it only reads refs
  }, []);

  return (
    <GameShell
      stage={stage}
      label={hud.over ? 'Start a new race' : hud.started ? 'Hold to jump' : 'Press to start running'}
      meta={
        hud.started
          ? `${hud.metres} m, ${hud.lives} ${hud.lives === 1 ? 'life' : 'lives'}${
              hud.gap === null || hud.over ? '' : hud.gap === 0 ? ', level with best' : `, ${Math.abs(hud.gap)} m ${hud.gap > 0 ? 'ahead of' : 'behind'} best`
            }`
          : 'On your marks'
      }
      score={`${hud.cleared} cleared${hud.best !== null ? `, best ${hud.best}` : ''}`}
      status={hud.line}
      action={hud.over ? { text: 'Race again', run: newRace } : undefined}
      rules="Hold to jump; hold longer to go higher. Three knocks and you’re out."
      keyAction="jump"
    />
  );
}
