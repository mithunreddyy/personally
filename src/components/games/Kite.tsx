import { useEffect, useRef, useState } from 'react';

import {
  Flight,
  HAND_Y,
  KITE_R,
  STRAIN_LIMIT,
  TOP,
  WIRE_SAG,
  createFlight,
  kiteOffset,
  press,
  release,
  stepFlight,
  stormAt,
  wind,
} from '../../lib/games/kite';
import { Pt, liveBest, makePen, reducedMotion, stridePose } from './draw';
import { GameShell } from './GameShell';
import { useStage } from './useStage';

const MIN_SCALE = 18;
const TAIL = 7;

const CAUSE_TEXT: Record<NonNullable<Flight['cause']>, string> = {
  tree: 'Caught in a tree',
  bird: 'Flew into the birds',
  ground: 'Dropped onto the grass',
  line: 'Held at the top too long and the line snapped',
  wire: 'Tangled in the power line',
  storm: 'Lost in the storm cloud',
};

/** Walk on flying a kite: hold to pull it up, let go to let it sink */
export default function Kite() {
  const g = useRef({ f: createFlight(), best: liveBest('kite'), metres: 0, overShown: false, tail: [] as Pt[] }).current;
  const [hud, setHud] = useState({ metres: 0, best: null as number | null, line: '', over: false, started: false, ahead: '' });

  /** What's coming, for the meta line: the next thing that changes how to fly */
  const ahead = () => {
    const f = g.f;
    const wire = f.wires.find(w => w.a > f.w && w.a < f.w + 30);
    if (wire) return `power line in ${Math.round(wire.a - f.w)} m`;
    if (stormAt(f.w + 20) < TOP + 0.3) return 'storm overhead';
    return '';
  };

  const pushHud = (line?: string) =>
    setHud(prev => ({
      metres: Math.floor(g.f.w),
      best: g.best.value,
      line: line ?? prev.line,
      over: g.f.over,
      started: g.f.started,
      ahead: ahead(),
    }));

  function newFlight() {
    g.f = createFlight();
    g.best.begin();
    g.tail = [];
    g.overShown = false;
    pushHud('');
    stage.run();
  }

  const kitePoint = (f: Flight): Pt => [f.w + kiteOffset(f.ky), f.ky];

  const stage = useStage({
    press() {
      if (g.f.over) {
        if (g.f.t > 0.8) newFlight();
        return;
      }
      if (!g.f.started) pushHud('');
      press(g.f);
    },
    release() {
      release(g.f);
    },
    cancel() {
      release(g.f);
    },
    frame(dt) {
      const f = g.f;
      stepFlight(f, dt);
      // The tail streams downwind of the kite, each bow easing toward the one before it
      const [kx, ky] = kitePoint(f);
      const head: Pt = [kx + 0.1, ky - 0.42];
      if (!g.tail.length) g.tail = Array.from({ length: TAIL }, (_, i) => [head[0] + i * 0.25, head[1] - i * 0.12] as Pt);
      const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 14);
      let prev = head;
      g.tail = g.tail.map(([x, y], i) => {
        const sway = reducedMotion() ? 0 : Math.sin(f.t * 5 - i * 0.9) * 0.05;
        const want: Pt = [prev[0] + 0.24, prev[1] - 0.1 + sway];
        const next: Pt = i === 0 ? head : [x + (want[0] - x) * k, y + (want[1] - y) * k];
        prev = next;
        return next;
      });

      if (f.over && !g.overShown) {
        g.overShown = true;
        pushHud(`${CAUSE_TEXT[f.cause ?? 'ground']} after ${Math.floor(f.w)} m.${g.best.passed ? ' New best.' : ''}`);
      } else if (Math.floor(f.w) !== g.metres) {
        g.metres = Math.floor(f.w);
        const passed = g.best.offer(g.metres);
        pushHud(passed ? 'New best, keep going' : undefined);
      }
      return f.started && (!f.over || f.ky > 0.15);
    },
    draw(ctx, W, H, colors) {
      const f = g.f;
      const motion = !reducedMotion();
      // Fit the sky's height, but keep at least 16 m of path in view, so on a tall portrait stage the kite
      // still has room ahead of it to see what's coming
      const s = Math.max(MIN_SCALE, Math.min((H - 16) / (TOP + 0.9), W / 16));
      const view = W / s;
      const left = f.w - 1.6;
      const p = makePen(ctx, colors, s, left, H - 10);
      const { X, Y, line } = p;
      p.grass(left, left + view, 2.6);

      // Gusts: short muted dashes riding the wind, brighter where it blows harder
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 1;
      const cell = 4;
      const drift = motion ? (f.t * 3) % cell : 0;
      for (let cx = Math.floor(left / cell) * cell; cx < left + view + cell; cx += cell) {
        for (let row = 0; row < 2; row++) {
          const n = Math.sin(cx * 12.9898 + row * 78.233) * 43758.5453;
          const r = n - Math.floor(n);
          const y = 2.5 + row * 3.4 + r * 2;
          const strength = wind(y, f.t, f.w) - 0.78;
          // Only the stronger gusts show, so the sky stays mostly clear
          if (strength <= 0.12 || r > 0.6) continue;
          const x = cx + r * cell + drift;
          ctx.globalAlpha = Math.min(0.7, strength * 2.2);
          ctx.beginPath();
          ctx.moveTo(X(x), Y(y));
          ctx.lineTo(X(x + 0.5 + strength), Y(y));
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Trees: a trunk and a round crown, solid enough to read as something to fly over
      for (const tr of f.trees) {
        if (tr.x < left - 2 || tr.x > left + view + 2) continue;
        const cy = tr.h - tr.r;
        line([[tr.x, 0], [tr.x, cy]], colors.ink, p.lw);
        ctx.fillStyle = colors.bg;
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = p.lw;
        ctx.beginPath();
        ctx.arc(X(tr.x), Y(cy), tr.r * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Storm: a lumpy cloud base along the top, with rain under it and now and then a flash of lightning
      if (stormAt(left + view) < TOP + 0.6) {
        const top = (H - 10) / s + 1;
        const base: Pt[] = [];
        for (let x = left - 1; x <= left + view + 1; x += 0.35) base.push([x, Math.min(top, stormAt(x))]);
        const inStorm = base.filter(([, y]) => y < TOP + 0.55);
        if (inStorm.length > 1) {
          ctx.fillStyle = colors.bg;
          ctx.beginPath();
          inStorm.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
          ctx.lineTo(X(inStorm[inStorm.length - 1][0]), 0);
          ctx.lineTo(X(inStorm[0][0]), 0);
          ctx.closePath();
          ctx.fill();
          // Scalloped underside: small arcs along the base
          ctx.strokeStyle = colors.ink;
          ctx.lineWidth = p.lw;
          ctx.beginPath();
          for (let i = 0; i < inStorm.length - 1; i += 2) {
            const [x, y] = inStorm[i];
            ctx.moveTo(X(x), Y(y));
            ctx.arc(X(x + 0.35), Y(y), 0.35 * s, Math.PI, 0, true);
          }
          ctx.stroke();
          // Rain
          // Rain: a short band of streaks just under the cloud, so the sky below stays readable
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = colors.muted;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const fall = motion ? (f.t * 6) % 1.2 : 0;
          for (let i = 0; i < inStorm.length; i += 4) {
            const [x, y] = inStorm[i];
            for (let d = 0.4 + fall; d < Math.min(2.2, y - 0.3); d += 1.2) {
              ctx.moveTo(X(x - 0.05), Y(y - d));
              ctx.lineTo(X(x - 0.2), Y(y - d - 0.35));
            }
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
          // Lightning: a short zigzag for a tenth of a second every few seconds
          if (motion && f.started && !f.over && f.t % 3.7 < 0.1) {
            const [bx, by] = inStorm[Math.floor((f.t * 13) % inStorm.length)];
            line([[bx, by], [bx - 0.3, by - 0.9], [bx + 0.15, by - 1.2], [bx - 0.2, by - 2.1]], colors.ink, p.lw);
          }
        }
      }

      // Power lines: two poles with crossarms and a sagging wire between them
      for (const wire of f.wires) {
        if (wire.b < left - 1 || wire.a > left + view + 1) continue;
        for (const x of [wire.a, wire.b]) {
          line([[x, 0], [x, wire.top + 0.3]], colors.ink, p.lw);
          line([[x - 0.35, wire.top], [x + 0.35, wire.top]], colors.ink, p.lw);
        }
        const pts: Pt[] = [];
        for (let i = 0; i <= 20; i++) {
          const u = i / 20;
          pts.push([wire.a + (wire.b - wire.a) * u, wire.top - WIRE_SAG * 4 * u * (1 - u)]);
        }
        line(pts, colors.ink, 1);
      }

      // Birds: a flapping v each
      for (const b of f.birds) {
        if (b.x < left - 1 || b.x > left + view + 1) continue;
        const flap = motion ? Math.sin(b.phase) * 0.16 : 0.1;
        line([[b.x - 0.42, b.y + 0.22 + flap], [b.x - 0.16, b.y + 0.06], [b.x, b.y], [b.x + 0.16, b.y + 0.06], [b.x + 0.42, b.y + 0.22 + flap]], colors.ink, p.lw);
      }

      // Walker, holding the line out in front; he pulls it in toward his chest while you hold
      const pulling = f.holding && !f.over;
      const pose = f.started && !f.over && motion ? stridePose(f.w, (f.w / 1.5) % 1, { lift: 0.12, reachLen: 0.3, arms: 0.2 }) : stridePose(f.w, 0.25, { lift: 0, reachLen: 0.12, arms: 0.1 });
      const hand: Pt = pulling ? [f.w + 0.18, HAND_Y - 0.12] : [f.w + 0.38, HAND_Y];
      pose.hands[0] = hand;
      pose.hands[1] = [hand[0] - 0.05, hand[1] - 0.04];
      pose.lean = pulling ? -0.06 : 0.04;
      p.figure(pose);

      // Line: sags when slack, straightens as it takes the pull, taut and trembling at the limit
      let [kx, ky] = kitePoint(f);
      const strain = f.strain / STRAIN_LIMIT;
      if (strain > 0 && motion) {
        kx += Math.sin(f.t * 55) * 0.05 * strain;
        ky += Math.cos(f.t * 61) * 0.04 * strain;
      }
      const sag = f.over ? 0.9 : pulling ? 0.25 * (1 - strain) : 0.7;
      const mid: Pt = [(hand[0] + kx) / 2, (hand[1] + ky) / 2 - sag];
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(hand[0]), Y(hand[1]));
      ctx.quadraticCurveTo(X(mid[0]), Y(mid[1]), X(kx), Y(ky));
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Tail with small bows
      if (g.tail.length) {
        line([[kx + 0.05, ky - 0.4], ...g.tail], colors.ink, 1);
        for (const [tx, ty] of g.tail.slice(1)) line([[tx - 0.07, ty + 0.06], [tx + 0.07, ty - 0.06]], colors.ink, 1.4);
      }

      // Kite: a diamond with its spars, tilting with how fast it climbs or sinks
      const tilt = Math.max(-0.5, Math.min(0.5, -f.vy * 0.18)) + 0.35;
      const size = Math.max(KITE_R * 1.4, 7 / s);
      const corner = (dx: number, dy: number): Pt => [kx + dx * Math.cos(tilt) - dy * Math.sin(tilt), ky + dx * Math.sin(tilt) + dy * Math.cos(tilt)];
      const pts = [corner(0, size), corner(size * 0.6, size * 0.15), corner(0, -size), corner(-size * 0.6, size * 0.15)];
      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = p.lw;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      line([pts[0], pts[2]], colors.ink, 1);
      line([pts[1], pts[3]], colors.ink, 1);
    },
  });

  useEffect(() => {
    g.best.load();
    pushHud();
    // Runs once on mount; it only reads refs
  }, []);

  return (
    <GameShell
      stage={stage}
      shape="tall"
      label={hud.over ? 'Fly again' : 'Hold to pull the kite up, let go to let it sink'}
      meta={hud.started ? `${hud.metres} m walked${hud.ahead && !hud.over ? `, ${hud.ahead}` : ''}` : 'Kite up, ready to walk'}
      score={hud.best !== null ? `best ${hud.best} m` : ''}
      status={hud.line}
      action={hud.over ? { text: 'Fly again', run: newFlight } : undefined}
      rules="Hold to climb, let go to sink. Stay clear of trees, birds, wires and the storm."
      keyAction="pull the line"
    />
  );
}
