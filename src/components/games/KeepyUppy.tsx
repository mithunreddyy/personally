import { useEffect, useRef, useState } from 'react';

import { BALL_R, HALF_WIDTH, Part, TOUCH_TIME, createJuggle, multiplier, stepJuggle, tap } from '../../lib/games/keepyuppy';
import { drawClouds } from './clouds';
import { HEAD_R, HIP, Pose, Pt, liveBest, makePen, reducedMotion, stridePose } from './draw';
import { GameShell } from './GameShell';
import { useStage } from './useStage';

const PART_TEXT: Record<Part, string> = { foot: 'Foot', knee: 'Knee', chest: 'Chest', head: 'Head' };
// Where each part sits on the standing figure, for the ring that marks a call
const PART_Y: Record<Part, number> = { foot: 0.08, knee: 0.38, chest: 1.12, head: HIP + 0.52 + 0.13 + HEAD_R + 0.02 };

/** The pose for the moment of a touch, by part; k runs 0..1 through the touch */
function touchPose(x: number, dir: number, part: Part, k: number, ball: Pt): Pose {
  const up = Math.sin(Math.PI * Math.min(1, k));
  const stand: [Pt, Pt] = [[x + 0.1 * dir, 0], [x - 0.1 * dir, 0]];
  switch (part) {
    case 'foot':
      return {
        hip: [x, HIP],
        dir,
        lean: -0.04,
        feet: [[x + (0.15 + 0.2 * up) * dir, 0.05 + (ball[1] - 0.05) * up], [x - 0.08 * dir, 0]],
        hands: [[x - 0.35 * dir, 1.0], [x + 0.35 * dir, 1.0]],
      };
    case 'knee':
      return {
        hip: [x, HIP],
        dir,
        feet: [[x + 0.06 * dir, 0.05 + 0.4 * up], [x - 0.06 * dir, 0]],
        hands: [[x - 0.32 * dir, 0.95], [x + 0.32 * dir, 0.95]],
      };
    case 'chest':
      return { hip: [x, HIP], dir, lean: -0.12 * up, feet: stand, hands: [[x - 0.45 * dir, 1.1], [x + 0.4 * dir, 1.12]] };
    case 'head':
      return {
        hip: [x, HIP + 0.1 * up],
        dir,
        lean: 0.05,
        feet: [[x + 0.1 * dir, 0.1 * up], [x - 0.1 * dir, 0.1 * up]],
        hands: [[x - 0.35 * dir, 1.0 + 0.1 * up], [x + 0.35 * dir, 1.0 + 0.1 * up]],
      };
  }
}

/** Juggle a ball off foot, knee, chest and head. Tap as it drops */
export default function KeepyUppy() {
  const g = useRef({ j: createJuggle(), best: liveBest('keepyuppy'), overShown: false }).current;
  const [hud, setHud] = useState({
    touches: 0,
    points: 0,
    mult: 1,
    call: null as Part | null,
    windy: false,
    best: null as number | null,
    line: '',
    over: false,
    started: false,
  });

  const pushHud = (line?: string) =>
    setHud(prev => ({
      touches: g.j.touches,
      points: g.j.points,
      mult: multiplier(g.j.clean),
      call: g.j.call?.part ?? null,
      windy: g.j.windMax > 0,
      best: g.best.value,
      line: line ?? prev.line,
      over: g.j.over,
      started: g.j.started,
    }));

  function newGame() {
    g.j = createJuggle();
    g.best.begin();
    g.overShown = false;
    pushHud('');
    stage.run();
  }

  const stage = useStage({
    press() {
      if (g.j.over) {
        if (g.j.t - g.j.overAt > 0.6) newGame();
        return;
      }
      const result = tap(g.j);
      if (result.kind === 'touch') {
        const passed = g.best.offer(g.j.points);
        const extras = [result.clean && 'clean', result.called && 'called it', `+${result.gained}`].filter(Boolean).join(', ');
        pushHud(`${PART_TEXT[result.part]}, ${extras}${passed ? '. New best' : ''}`);
      }
      else if (result.kind === 'whiff') pushHud('Missed it');
      else if (result.kind === 'start') pushHud('');
    },
    release() {},
    cancel() {},
    frame(dt) {
      const j = g.j;
      stepJuggle(j, dt);
      if (j.over && !g.overShown) {
        g.overShown = true;
        pushHud(
          `Down after ${j.touches} ${j.touches === 1 ? 'touch' : 'touches'} and ${j.points} ${j.points === 1 ? 'point' : 'points'}, ${j.bestClean} clean in a row at most.${g.best.passed ? ' New best.' : ''}`,
        );
      }
      // Keep drawing while anything moves: the ball in play, a touch finishing, the last bounces
      // The clouds keep drifting, so the stage keeps drawing while it's on screen (never under reduced motion)
      return (j.started && (!j.over || j.t - j.overAt < 2)) || !reducedMotion();
    },
    draw(ctx, W, H, colors, now) {
      const j = g.j;
      // Fit the yard edge to edge, so the stage's own sides are where the ball comes back off; never
      // shorter than 3.5 m of headroom
      const s = Math.min(W / ((HALF_WIDTH + BALL_R) * 2), (H - 12) / 3.5);
      const left = -W / s / 2;
      const p = makePen(ctx, colors, s, left, H - 10);
      drawClouds(ctx, W, H, colors, now, { sky: 1 });
      p.grass(left, -left, 1.7);

      const { boy, ball } = j;
      const motion = !reducedMotion();
      let pose: Pose;
      if (!j.started) {
        // Ball held at the chest, ready to drop
        pose = { hip: [boy.x, HIP], dir: 1, feet: [[boy.x + 0.1, 0], [boy.x - 0.1, 0]], hands: [[ball.x - 0.05, ball.y - 0.08], [ball.x + 0.05, ball.y - 0.1]] };
      } else if (j.over) {
        pose = { hip: [boy.x, HIP], dir: boy.dir, feet: [[boy.x + 0.1, 0], [boy.x - 0.1, 0]], hands: [[boy.x + 0.06, 1.6], [boy.x - 0.06, 1.6]] };
      } else if (j.touch && j.t - j.touch.at < TOUCH_TIME) {
        pose = touchPose(boy.x, boy.dir, j.touch.part, (j.t - j.touch.at) / TOUCH_TIME, [ball.x, ball.y]);
      } else if (j.whiff !== null && j.t - j.whiff < TOUCH_TIME) {
        pose = touchPose(boy.x, boy.dir, 'foot', (j.t - j.whiff) / TOUCH_TIME, [boy.x + 0.4 * boy.dir, 0.45]);
      } else if (Math.abs(boy.vx) > 0.3 && motion) {
        // Shuffling after the ball: the stride follows the ground he covers, so his feet don't slide
        const pose0 = stridePose(boy.x, ((boy.x * boy.dir) / 1.1) % 1, { lift: 0.14, reachLen: 0.3, arms: 0.25 });
        pose = boy.dir > 0 ? pose0 : mirror(pose0, boy.x);
      } else {
        pose = { hip: [boy.x, HIP], dir: boy.dir, feet: [[boy.x + 0.12 * boy.dir, 0], [boy.x - 0.1 * boy.dir, 0]], hands: [[boy.x - 0.3 * boy.dir, 0.95], [boy.x + 0.3 * boy.dir, 0.95]] };
      }
      p.figure(pose);

      // A called part wears a dashed ring until it plays the ball or the call lapses
      if (j.call && !j.over) {
        const ring = PART_Y[j.call.part];
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.X(boy.x + (j.call.part === 'foot' ? 0.12 * boy.dir : 0)), p.Y(ring), (j.call.part === 'head' ? HEAD_R + 0.1 : 0.16) * p.s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Leaves riding the wind once it gets up, so the push on the ball has something to show it
      if (j.windMax > 0) {
        const span = HALF_WIDTH * 2 + 1;
        for (let i = 0; i < 5; i++) {
          const seed = Math.sin(i * 91.7) * 1000;
          const y = 0.6 + ((seed - Math.floor(seed)) * 2.6);
          const drift = motion ? j.t * (0.6 + Math.abs(j.wind) * 0.9) * Math.sign(j.wind || 1) : 0;
          const x = (((i * 1.7 + drift) % span) + span) % span - span / 2;
          const tilt = motion ? Math.sin(j.t * 3 + i) * 0.08 : 0.05;
          ctx.globalAlpha = Math.min(0.8, 0.3 + j.windMax / 2);
          p.line([[x - 0.08, y - tilt], [x + 0.08, y + tilt]], colors.muted, 1.6);
        }
        ctx.globalAlpha = 1;
      }

      p.ball(ball.x, ball.y, BALL_R, ball.spin);
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
      label={hud.over ? 'Start again' : hud.started ? 'Tap to touch the ball' : 'Tap to drop the ball and start'}
      meta={
        hud.started
          ? [
              `${hud.touches} ${hud.touches === 1 ? 'touch' : 'touches'}`,
              hud.mult > 1 && `x${hud.mult}`,
              hud.call && !hud.over && `${PART_TEXT[hud.call].toLowerCase()} called`,
              hud.windy && !hud.over && 'windy',
            ]
              .filter(Boolean)
              .join(', ')
          : 'Ball in hand'
      }
      score={`${hud.points} ${hud.points === 1 ? 'point' : 'points'}${hud.best !== null ? `, best ${hud.best}` : ''}`}
      status={hud.line}
      action={hud.over ? { text: 'Play again', run: newGame } : undefined}
      rules="Tap as the ball drops. A clean touch is 2, and the ringed body part scores 3 more."
      keyAction="touch the ball"
    />
  );
}

/** A right-facing pose turned to face left about x */
function mirror(pose: Pose, x: number): Pose {
  const m = ([px, py]: Pt): Pt => [2 * x - px, py];
  return { ...pose, dir: -pose.dir, hip: m(pose.hip), feet: [m(pose.feet[0]), m(pose.feet[1])], hands: [m(pose.hands[0]), m(pose.hands[1])] };
}
