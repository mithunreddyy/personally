import { useEffect, useRef, useState } from 'react';

import {
  BALL_R,
  BAR_Y,
  Flight,
  KEEPER_STANCE,
  KEEPER_X,
  NET_DEPTH,
  NET_ROOF,
  Outcome,
  WALL_GAP,
  WALL_TOP,
  createFlight,
  isGoal,
  pointsFor,
  KickSetup,
  TYRE_R,
  roundPlan,
  stepFlight,
  wallLift,
} from '../../lib/games/freekick';
import { HIP, Pose, Pt, liveBest, makePen, reducedMotion } from './draw';
import { GameShell } from './GameShell';
import { useStage } from './useStage';

// The meter fills over 1.2s and then holds full, so holding too long overhits instead of looping back
const CHARGE_MS = 1200;
const KICK_SWING = 0.16;
const NEXT_KICK_MS = 650;
// The camera never zooms out past 18.5px a metre, so the figures stay readable on a phone
// The aiming view runs from just behind the power meter to just past the corner flag
const BEHIND = 2;
const PAST_NET = NET_DEPTH + 0.75;

const RESULT_TEXT: Record<Outcome, string> = {
  topbins: 'Top corner',
  goal: 'Goal',
  barin: 'Off the bar and in',
  saved: 'Saved',
  wall: 'Hit the wall',
  over: 'Over the bar',
  bar: 'Off the bar',
  short: 'Didn’t reach the goal',
};

type Phase = 'ready' | 'charging' | 'flight' | 'over';

/** Wind for the meta line, from the kicker's side: behind him carries the ball, in his face holds it up */
const windText = (wind: number) => (wind === 0 ? '' : `, ${Math.abs(wind).toFixed(1)} m/s ${wind > 0 ? 'tailwind' : 'headwind'}`);

/** A free kick against a wall and a keeper. Hold to wind up, let go to kick */
export default function FreeKick() {
  const g = useRef({
    plan: [] as KickSetup[],
    index: 0,
    points: 0,
    goals: 0,
    streak: 0,
    best: liveBest('freekick'),
    phase: 'ready' as Phase,
    chargeStart: 0,
    power: 0,
    flight: null as Flight | null,
    lastOutcome: null as Outcome | null,
    outcomeAt: 0,
    cam: { left: 0, scale: 0, set: false },
    nextTimer: 0,
  }).current;
  const [hud, setHud] = useState({ kick: 1, distance: 0, wind: 0, tyre: false, points: 0, best: null as number | null, line: '', over: false });

  const pushHud = (line?: string) =>
    setHud(prev => ({
      kick: Math.min(g.index + 1, 10),
      distance: setupNow()?.distance ?? 0,
      wind: setupNow()?.wind ?? 0,
      tyre: (setupNow()?.tyre ?? null) !== null,
      points: g.points,
      best: g.best.value,
      line: line ?? prev.line,
      over: g.phase === 'over',
    }));

  const setupNow = (): KickSetup | undefined => g.plan[g.index];
  const distanceNow = () => setupNow()?.distance ?? 0;

  function cameraTarget(width: number, height: number) {
    const distance = g.flight?.distance ?? distanceNow();
    const start = -distance - BEHIND;
    // Aiming: the whole pitch, kicker to net, at any width, so the shot can be judged
    const fit = width / (PAST_NET - start);
    const f = g.flight;
    if (!f) return { scale: fit, left: start };
    // In flight: push in toward 3.6 to 6 metres of sky and follow the ball, a little left of centre so
    // the goal comes into view ahead of it; a ball going high pulls the camera back to keep it in frame
    const groundY = height - Math.max(10, height * 0.08);
    const close = Math.min(groundY / 3.6, Math.max(groundY / 6, fit * 1.6), groundY / (f.ball.y + 0.7));
    const scale = Math.max(fit, close);
    const view = width / scale;
    const want = f.ball.x - view * 0.4;
    return { scale, left: Math.min(PAST_NET - view, Math.max(start, want)) };
  }

  function newRound() {
    window.clearTimeout(g.nextTimer);
    g.plan = roundPlan();
    g.best.begin();
    Object.assign(g, { index: 0, points: 0, goals: 0, streak: 0, flight: null, lastOutcome: null, phase: 'ready' });
    g.cam.set = false;
    pushHud('');
    stage.run();
  }

  function finishKick() {
    const f = g.flight;
    if (!f) return;
    if (!g.lastOutcome) {
      g.lastOutcome = f.outcome ?? 'short';
      g.streak = 0;
      pushHud(RESULT_TEXT[g.lastOutcome]);
    }
    window.clearTimeout(g.nextTimer);
    g.nextTimer = window.setTimeout(() => {
      g.flight = null;
      g.lastOutcome = null;
      g.index += 1;
      if (g.index >= 10) {
        g.phase = 'over';
        g.index = 9;
        pushHud(`Round over: ${g.goals} of 10 in, ${g.points} points.${g.best.passed ? ' New best.' : ''}`);
      } else {
        g.phase = 'ready';
        pushHud();
      }
      stage.run();
    }, NEXT_KICK_MS);
  }

  const stage = useStage({
    press() {
      if (g.phase === 'over') return newRound();
      if (g.phase !== 'ready') return;
      g.phase = 'charging';
      g.chargeStart = performance.now();
      g.power = 0;
    },
    release() {
      if (g.phase !== 'charging') return;
      g.power = Math.min(1, (performance.now() - g.chargeStart) / CHARGE_MS);
      const setup = setupNow();
      if (!setup) return;
      g.flight = createFlight(setup, g.power);
      g.lastOutcome = null;
      g.phase = 'flight';
    },
    cancel() {
      if (g.phase === 'charging') g.phase = 'ready';
      g.power = 0;
    },
    frame(dt, now) {
      if (g.phase === 'charging') g.power = Math.min(1, (now - g.chargeStart) / CHARGE_MS);
      const f = g.flight;
      if (f && !f.done) {
        stepFlight(f, dt);
        if (f.outcome && !g.lastOutcome) {
          g.lastOutcome = f.outcome;
          g.outcomeAt = f.t;
          if (isGoal(f.outcome)) {
            g.streak += 1;
            g.goals += 1;
          } else g.streak = 0;
          const gained = pointsFor(f.outcome, g.streak, f.throughTyre);
          g.points += gained;
          const doubled = gained > 0 && g.streak >= 3;
          const passed = g.best.offer(g.points);
          const what = f.throughTyre && isGoal(f.outcome) ? `${RESULT_TEXT[f.outcome]}, through the tyre` : RESULT_TEXT[f.outcome];
          pushHud(`${what}${gained ? `, +${gained}` : ''}${doubled ? ', doubled' : ''}${passed ? '. New best' : ''}`);
        }
        if (f.done) finishKick();
      }
      // Ease the camera toward its target. Until the stage has been measured there is nothing to frame,
      // and a zero-width fit would give a zero scale and an endless view
      if (!stage.view.width || !stage.view.height) return g.phase === 'charging' || g.phase === 'flight';
      const target = cameraTarget(stage.view.width, stage.view.height);
      let moving = false;
      if (reducedMotion() || !g.cam.set) Object.assign(g.cam, target, { set: true });
      else {
        const k = 1 - Math.exp(-dt * 7);
        g.cam.left += (target.left - g.cam.left) * k;
        g.cam.scale += (target.scale - g.cam.scale) * k;
        moving = Math.abs(target.left - g.cam.left) > 0.01 || Math.abs(target.scale - g.cam.scale) > 0.05;
      }
      return g.phase === 'charging' || g.phase === 'flight' || moving;
    },
    draw(ctx, W, H, colors, now) {
      if (!g.plan.length) return;
      if (!g.cam.set || !(g.cam.scale > 0)) Object.assign(g.cam, cameraTarget(W, H), { set: true });
      const { left, scale: s } = g.cam;
      const right = left + W / s;
      const p = makePen(ctx, colors, s, left, H - Math.max(10, H * 0.08));
      const { X, Y, line, figure } = p;
      p.grass(left, right);

      const flight = g.flight;
      const t = flight?.t ?? 0;
      const motion = !reducedMotion();

      // Net: roof and back in muted, with a ripple where the ball lands that dies away
      let bulge = 0;
      let bulgeY = BAR_Y / 2;
      if (flight?.netHit && motion) {
        const since = flight.t - flight.netHit.t;
        bulge = 0.35 * Math.exp(-since * 5) * Math.cos(since * 22);
        bulgeY = flight.netHit.y;
      }
      const backAt = (y: number) => NET_ROOF + (NET_DEPTH - NET_ROOF) * (1 - y / BAR_Y);
      const back: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const y = BAR_Y * (1 - i / 12);
        back.push([backAt(y) + bulge * Math.exp(-Math.pow((y - bulgeY) / 0.45, 2)), y]);
      }
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      for (let i = 1; i < 6; i++) {
        const x = (NET_ROOF * i) / 6;
        ctx.moveTo(X(x), Y(BAR_Y));
        ctx.lineTo(X(x + (NET_DEPTH - NET_ROOF) * 0.02 * i), Y(0));
      }
      for (let i = 1; i < 5; i++) {
        const pt = back[Math.round((i / 5) * 12)];
        ctx.moveTo(X(0), Y(pt[1]));
        ctx.lineTo(X(pt[0]), Y(pt[1]));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      line([[0, BAR_Y], [NET_ROOF, BAR_Y], ...back], colors.muted, 1);
      // Frame: the near post, and the crossbar seen end on
      line([[0, 0], [0, BAR_Y]], colors.ink);
      ctx.fillStyle = colors.ink;
      ctx.beginPath();
      ctx.arc(X(0), Y(BAR_Y), Math.max(p.lw * 0.9, 0.06 * s), 0, Math.PI * 2);
      ctx.fill();

      const conditions = g.flight ?? setupNow();
      // Training tyre on the late kicks, hung from the bar on a rope, seen as a ring in the goal mouth
      if (conditions?.tyre != null) {
        const ty = conditions.tyre;
        const sway = motion ? Math.sin(now / 700) * 0.03 : 0;
        line([[0.06, BAR_Y], [0.06 + sway, ty + TYRE_R]], colors.muted, 1);
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = Math.max(2, p.lw * 1.3);
        ctx.beginPath();
        ctx.ellipse(X(0.06 + sway), Y(ty), Math.max(2.5, 0.07 * s), TYRE_R * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Corner flag behind the net, its cloth blown the way the wind goes and longer the harder it blows
      {
        const fx = NET_DEPTH + 0.5;
        const wind = conditions?.wind ?? 0;
        line([[fx, 0], [fx, 1.5]], colors.muted, 1);
        const len = wind === 0 ? 0.16 : 0.22 + Math.min(0.3, Math.abs(wind) * 0.07);
        const dir = wind === 0 ? 0 : Math.sign(wind);
        const flutter = motion && wind !== 0 ? Math.sin(now / 90) * 0.04 * Math.abs(wind) * 0.4 : 0;
        const tip: Pt = dir === 0 ? [fx + 0.05, 1.18] : [fx + dir * len, 1.38 + flutter];
        ctx.fillStyle = colors.ink;
        ctx.beginPath();
        ctx.moveTo(X(fx), Y(1.5));
        ctx.lineTo(X(tip[0]), Y(tip[1]));
        ctx.lineTo(X(fx), Y(1.26));
        ctx.closePath();
        ctx.fill();
      }

      // Keeper: off his line facing the ball, hands where his read of the flight puts them
      {
        const handY = flight ? flight.hands : KEEPER_STANCE;
        // Arms up give him 1.85 m of reach from the grass; above that he jumps, below 1.25 he crouches
        const lift = Math.max(0, handY - 1.85);
        const crouch = Math.max(0, Math.min(0.32, 1.25 - handY));
        const spread = handY > 1.3 ? 0.12 : 0.3;
        figure({
          hip: [KEEPER_X, HIP - crouch + lift],
          dir: -1,
          lean: crouch * 0.6,
          feet: [[KEEPER_X - 0.12, lift], [KEEPER_X + 0.14, lift]],
          hands: [[KEEPER_X - spread, handY], [KEEPER_X - spread + 0.08, handY - 0.05]],
        });
      }

      const distance = flight?.distance ?? distanceNow();
      // Wall: three defenders shoulder to shoulder, one in front of two
      const wallX = -distance + WALL_GAP;
      const setup = flight ?? setupNow();
      const level = setup?.level ?? 0;
      const lift = flight ? wallLift(t, level) : 0;
      const scale = WALL_TOP / 1.9;
      [0.34, 0.17, 0].forEach((offset, i) => {
        const x = wallX + offset;
        figure(
          {
            hip: [x, HIP * scale + lift],
            dir: -1,
            feet: [[x - 0.08, lift], [x + 0.1, lift]],
            // Hands held low in front, the way a wall stands
            hands: [[x - 0.16, 0.86 + lift], [x - 0.12, 0.9 + lift]],
          },
          i === 2 ? 1 : 0.45,
        );
      });

      // Kicker: the walker's cousin, a step behind the ball
      const ballX = -distance;
      const hipX = ballX - 0.55;
      const since = flight ? flight.t : 0;
      let pose: Pose;
      if (g.phase === 'charging' || (flight && since < KICK_SWING)) {
        // Wind-up pulls the kicking foot back and up; the swing brings it through the ball
        const pw = g.phase === 'charging' ? g.power : g.power * (1 - since / KICK_SWING);
        const swing = flight ? Math.min(1, since / KICK_SWING) : 0;
        const backFoot: Pt = [hipX - 0.25 - 0.35 * pw, 0.12 + 0.45 * pw];
        const through: Pt = [hipX + 0.75, 0.55];
        const foot: Pt = [backFoot[0] + (through[0] - backFoot[0]) * swing, backFoot[1] + (through[1] - backFoot[1]) * swing];
        pose = {
          hip: [hipX, HIP - 0.04 * pw],
          dir: 1,
          lean: -0.06 * pw,
          feet: [foot, [hipX + 0.22, 0]],
          hands: [[hipX - 0.4 - 0.1 * pw, 0.95 + 0.2 * pw], [hipX + 0.45, 1.05 + 0.25 * pw]],
        };
      } else if (flight && g.lastOutcome && isGoal(g.lastOutcome)) {
        // Both arms up, with a small hop while the moment lasts
        const hop = motion ? Math.max(0, Math.sin((flight.t - g.outcomeAt) * 9)) * 0.12 : 0;
        pose = {
          hip: [hipX, HIP + hop],
          dir: 1,
          feet: [[hipX + 0.1, hop], [hipX - 0.1, hop]],
          hands: [[hipX + 0.25, 1.9 + hop], [hipX - 0.2, 1.88 + hop]],
        };
      } else if (flight && g.lastOutcome) {
        // Hands on his head
        pose = { hip: [hipX, HIP], dir: 1, feet: [[hipX + 0.1, 0], [hipX - 0.1, 0]], hands: [[hipX + 0.06, 1.6], [hipX - 0.06, 1.6]] };
      } else if (flight) {
        // Follow-through, kicking leg still up as he watches it go
        pose = {
          hip: [hipX + 0.15, HIP],
          dir: 1,
          lean: 0.05,
          feet: [[hipX + 0.75, 0.4], [hipX + 0.3, 0]],
          hands: [[hipX - 0.3, 1.1], [hipX + 0.55, 1.15]],
        };
      } else {
        pose = { hip: [hipX, HIP], dir: 1, feet: [[hipX + 0.12, 0], [hipX - 0.1, 0]], hands: [[hipX + 0.1, 0.72], [hipX - 0.12, 0.74]] };
      }
      figure(pose);

      // The kick's path trails behind it as a faint dashed line, and stays until the next kick is set
      if (flight && flight.trail.length > 1) {
        ctx.setLineDash([2, 5]);
        line(flight.trail, colors.muted, 1, 0.7);
        ctx.setLineDash([]);
      }

      const b = flight?.ball ?? { x: ballX, y: BALL_R, spin: 0 };
      p.ball(b.x, b.y, BALL_R, b.spin);

      // Power meter: a thin upright bar behind the kicker, filling while the kick is held
      if (g.phase === 'charging' || g.phase === 'ready') {
        const mx = X(hipX - 0.95);
        const top = Y(1.75);
        const bottom = Y(0.15);
        ctx.strokeStyle = colors.muted;
        ctx.lineWidth = 1;
        ctx.strokeRect(mx - 2.5, top, 5, bottom - top);
        if (g.phase === 'charging') {
          ctx.fillStyle = colors.ink;
          const h = (bottom - top) * g.power;
          ctx.fillRect(mx - 2.5, bottom - h, 5, h);
        }
      }

      // Mid-flight, when the goal is out of frame, a small chevron at the right edge points to it
      if (flight && right < 0.3) {
        const cx = W - 6;
        const cy = Y(BAR_Y / 2);
        ctx.strokeStyle = colors.muted;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 5);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - 5, cy + 5);
        ctx.stroke();
      }
    },
  });

  useEffect(() => {
    g.best.load();
    newRound();
    return () => window.clearTimeout(g.nextTimer);
    // Runs once on mount; newRound only touches refs and state setters
  }, []);

  return (
    <GameShell
      stage={stage}
      shape="wide"
      label={hud.over ? 'Start a new round of ten kicks' : `Free kick from ${hud.distance} metres. Hold to wind up, let go to kick.`}
      meta={hud.distance ? `Kick ${hud.kick} of 10, ${hud.distance} m${windText(hud.wind)}` : 'Ten kicks'}
      score={`${hud.points} ${hud.points === 1 ? 'point' : 'points'}${hud.best !== null ? `, best ${hud.best}` : ''}`}
      status={hud.line}
      action={hud.over ? { text: 'Play again', run: newRound } : undefined}
      rules="Hold to power up, let go to kick. A goal is 2, the top corner 3, through the tyre 3 more, and from the third goal in a row points double."
      keyAction="wind up"
    />
  );
}
