// Physics for the free-kick experiment. Plain numbers, no DOM, so it runs the same in the browser
// and in a Node script. Units are metres and seconds; x runs toward the goal, y runs up, and the
// goal line sits at x = 0, so the ball always starts at x = -distance.

export const GRAVITY = 9.81;
export const BALL_R = 0.11;
export const BAR_Y = 2.44;
const BAR_R = 0.06;
// Side profile of the net: the roof runs back flat from the bar, then the back drops to the grass
export const NET_ROOF = 0.9;
export const NET_DEPTH = 1.7;
// Air drag on a size 5 ball: 0.5 * air density * Cd * area / mass, so long kicks dip as they slow
const DRAG = 0.012;
const SUBSTEP = 1 / 480;

// The kick leaves the foot at a fixed angle; the only thing the player controls is how hard
export const LAUNCH_ANGLE = (22 * Math.PI) / 180;

// The wall stands the regulation 9.15 m from the ball and jumps just after the kick
export const WALL_GAP = 9.15;
export const WALL_TOP = 1.9;
// The wall jumps higher as the round goes on
const WALL_JUMP = 0.4;
const WALL_JUMP_LATE = 0.12;
const WALL_JUMP_START = 0.06;
const WALL_JUMP_TIME = 0.62;
const WALL_HALF = 0.14;

// The keeper stands just off his line with his hands up, reads the flight, then reaches for it
export const KEEPER_X = -0.75;
export const KEEPER_STANCE = 1.55;
// The keeper sharpens up through the round: quicker read, quicker hands, a little more reach
const KEEPER_REACH = 1.98;
const KEEPER_REACH_LATE = 0.05;
const KEEPER_LOW = 0.3;
const KEEPER_REACT = 0.2;
const KEEPER_REACT_LATE = -0.07;
const KEEPER_SPEED = 3.2;
const KEEPER_SPEED_LATE = 1.1;
const KEEPER_HALF = 0.13;
// Feet to fingertips with his arms up
export const KEEPER_SPAN = 2.05;

// A goal that crosses the line this high, under the bar, is in the top corner
const TOP_BINS = 2.18;

// Power maps onto a band around the speed that lands the ball just under the bar. The sweet spot
// sits low on the meter for the nearest kick and high for the farthest, so each distance asks for
// its own touch and no single power scores from everywhere
const AIM_Y = 2.12;
const POWER_SPAN = 0.22;
const SWEET_NEAR = 0.42;
const SWEET_FAR = 0.8;

export const MIN_DISTANCE = 16;
export const MAX_DISTANCE = 24;

// A training tyre hung from the bar on the late kicks: through it is a bonus
export const TYRE_R = 0.2;
const TYRE_BONUS = 3;

export type Outcome = 'goal' | 'topbins' | 'barin' | 'saved' | 'wall' | 'over' | 'bar' | 'short';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation in radians, for drawing the panels */
  spin: number;
}

/** Height of the ball as it crosses x, ignoring the wall, keeper and bar; null if it lands first.
    Wind is the air's own speed along x, so drag works on the ball's speed through the air */
function heightAt(px: number, py: number, vx: number, vy: number, x: number, wind = 0): number | null {
  if (vx <= 0) return null;
  for (let i = 0; i < 4000; i++) {
    const v = Math.hypot(vx - wind, vy);
    vx -= DRAG * v * (vx - wind) * SUBSTEP;
    vy -= (GRAVITY + DRAG * v * vy) * SUBSTEP;
    const nx = px + vx * SUBSTEP;
    const ny = py + vy * SUBSTEP;
    if (nx >= x) return py + ((ny - py) * (x - px)) / (nx - px);
    if (ny < 0) return null;
    px = nx;
    py = ny;
  }
  return null;
}

/** The launch speed that crosses the goal line at AIM_Y, found by bisection since drag has no closed form */
function referenceSpeed(distance: number): number {
  let lo = 5;
  let hi = 45;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const y = heightAt(-distance, BALL_R, mid * Math.cos(LAUNCH_ANGLE), mid * Math.sin(LAUNCH_ANGLE), 0);
    if (y === null || y < AIM_Y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const speedCache = new Map<number, number>();

export function launchSpeed(distance: number, power: number): number {
  let ref = speedCache.get(distance);
  if (ref === undefined) {
    ref = referenceSpeed(distance);
    speedCache.set(distance, ref);
  }
  const sweet = SWEET_NEAR + ((SWEET_FAR - SWEET_NEAR) * (distance - MIN_DISTANCE)) / (MAX_DISTANCE - MIN_DISTANCE);
  return ref * (0.995 + POWER_SPAN * (Math.min(1, Math.max(0, power)) - sweet));
}

/** How far the wall has jumped at time t after the kick, higher on later kicks */
export function wallLift(t: number, level = 0): number {
  const s = (t - WALL_JUMP_START) / WALL_JUMP_TIME;
  return s > 0 && s < 1 ? (WALL_JUMP + WALL_JUMP_LATE * level) * Math.sin(Math.PI * s) : 0;
}

export function pointsFor(outcome: Outcome, streak: number, tyre = false): number {
  const base = outcome === 'topbins' ? 3 : outcome === 'goal' || outcome === 'barin' ? 2 : 0;
  const bonus = base && tyre ? TYRE_BONUS : 0;
  // From the third goal in a row, every goal counts double until a miss
  return streak >= 3 ? (base + bonus) * 2 : base + bonus;
}

export const isGoal = (outcome: Outcome | null) => outcome === 'goal' || outcome === 'topbins' || outcome === 'barin';

/** One kick's conditions. Level runs 0 on the first kick to 1 on the last */
export interface KickSetup {
  distance: number;
  /** Air speed along the kick in m/s: positive behind the ball, negative in its face */
  wind: number;
  level: number;
  /** Height of the training tyre's centre, or null when there isn't one */
  tyre: number | null;
}

/**
 * Ten kicks that get harder: the spot drifts back from 16 to 24 m, wind comes in from the fourth kick
 * and grows, the keeper and wall sharpen, and a tyre hangs in the goal for the last four
 */
export function roundPlan(random = Math.random): KickSetup[] {
  const out: KickSetup[] = [];
  for (let i = 0; i < 10; i++) {
    const level = i / 9;
    let distance = Math.round(MIN_DISTANCE + (MAX_DISTANCE - MIN_DISTANCE) * level + (random() * 2 - 1) * 1.4);
    distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, distance));
    if (out.length && distance === out[out.length - 1].distance) distance += distance < MAX_DISTANCE ? 1 : -1;
    const windy = i >= 3;
    // Up to 1 + 2.2 m/s by the last kick; any more in the face of a 24 m kick and no power reaches
    const wind = windy ? Math.round((random() < 0.5 ? -1 : 1) * (1 + random() * 2.2 * level) * 10) / 10 : 0;
    // Hung in the band above the keeper's reach and under the bar, so it is always on
    const tyre = i >= 6 ? Math.round((1.98 + random() * 0.26) * 100) / 100 : null;
    out.push({ distance, wind, level, tyre });
  }
  return out;
}

export interface Flight {
  readonly distance: number;
  readonly speed: number;
  readonly wind: number;
  readonly level: number;
  readonly tyre: number | null;
  /** The ball went through the tyre on its way in */
  throughTyre: boolean;
  ball: Ball;
  t: number;
  /** Height of the keeper's hands */
  hands: number;
  outcome: Outcome | null;
  /** Seconds since the outcome was decided */
  settled: number;
  /** Set when the ball hits the back of the net: when and how high, for the ripple */
  netHit: { t: number; y: number } | null;
  barHit: number | null;
  read: number | null;
  readAt: number;
  trail: [number, number][];
  done: boolean;
}

export function createFlight(setup: KickSetup | number, power: number): Flight {
  const { distance, wind, level, tyre } = typeof setup === 'number' ? { distance: setup, wind: 0, level: 0, tyre: null } : setup;
  const speed = launchSpeed(distance, power);
  return {
    distance,
    speed,
    wind,
    level,
    tyre,
    throughTyre: false,
    ball: { x: -distance, y: BALL_R, vx: speed * Math.cos(LAUNCH_ANGLE), vy: speed * Math.sin(LAUNCH_ANGLE), spin: 0 },
    t: 0,
    hands: KEEPER_STANCE,
    outcome: null,
    settled: 0,
    netHit: null,
    barHit: null,
    read: null,
    readAt: 0,
    trail: [[-distance, BALL_R]],
    done: false,
  };
}

/** Where the keeper wants his hands: where the flight will cross him, or the ball itself once it bounces */
function keeperTarget(f: Flight): number {
  const b = f.ball;
  const y = heightAt(b.x, b.y, b.vx, b.vy, KEEPER_X, f.wind);
  // His hands sit a little above the ball so his body covers it
  const want = (y ?? b.y) + BALL_R * 0.5 + (y === null ? 0.5 : 0);
  return Math.min(KEEPER_REACH + KEEPER_REACH_LATE * f.level, Math.max(KEEPER_LOW, want));
}

function decide(f: Flight, outcome: Outcome) {
  if (!f.outcome) f.outcome = outcome;
}

/** Advance the flight by dt seconds in small fixed substeps, so a fast ball can't pass through the bar */
export function stepFlight(f: Flight, dt: number) {
  if (f.done) return;
  let left = Math.min(dt, 0.05);
  while (left > 1e-9) {
    const h = Math.min(SUBSTEP, left);
    left -= h;
    substep(f, h);
  }
  const last = f.trail[f.trail.length - 1];
  if (Math.hypot(f.ball.x - last[0], f.ball.y - last[1]) > 0.25) f.trail.push([f.ball.x, f.ball.y]);
}

function substep(f: Flight, h: number) {
  const b = f.ball;
  f.t += h;
  if (f.outcome) f.settled += h;

  // Keeper: a short read, then his hands move toward the target at a limited speed
  if (f.t > KEEPER_REACT + KEEPER_REACT_LATE * f.level && !f.outcome) {
    // He re-reads the ball about twenty times a second, not every substep
    if (f.read === null || f.t - f.readAt > 0.05) {
      f.read = keeperTarget(f);
      f.readAt = f.t;
    }
    const target = f.read;
    const step = (KEEPER_SPEED + KEEPER_SPEED_LATE * f.level) * h;
    f.hands += Math.max(-step, Math.min(step, target - f.hands));
  }

  const v = Math.hypot(b.vx - f.wind, b.vy);
  b.vx -= DRAG * v * (b.vx - f.wind) * h;
  b.vy -= (GRAVITY + DRAG * v * b.vy) * h;
  const prevX = b.x;
  b.x += b.vx * h;
  b.y += b.vy * h;
  b.spin -= (b.vx / BALL_R) * h * 0.35;

  // Grass: bounce, losing pace each time, then roll to a stop
  if (b.y < BALL_R) {
    b.y = BALL_R;
    if (b.vy < -0.8) {
      b.vy = -b.vy * 0.5;
      b.vx *= 0.8;
    } else {
      b.vy = 0;
      b.vx *= 1 - 1.4 * h;
    }
  }

  const wallX = -f.distance + WALL_GAP;
  const lift = wallLift(f.t, f.level);
  const wallTop = WALL_TOP + lift;
  if (!f.outcome && Math.abs(b.x - wallX) < BALL_R + WALL_HALF && b.y - BALL_R < wallTop && b.y + BALL_R > lift) {
    b.x = wallX - (BALL_R + WALL_HALF);
    b.vx = -Math.abs(b.vx) * 0.3;
    b.vy = Math.max(b.vy * 0.3, 1.6);
    decide(f, 'wall');
  }

  const handsLow = f.hands - KEEPER_SPAN;
  if (!f.outcome && Math.abs(b.x - KEEPER_X) < BALL_R + KEEPER_HALF && b.y - BALL_R < f.hands && b.y + BALL_R > Math.max(0, handsLow)) {
    b.x = KEEPER_X - (BALL_R + KEEPER_HALF);
    b.vx = -Math.abs(b.vx) * 0.25;
    b.vy = Math.max(b.vy * 0.2, 2.2);
    decide(f, 'saved');
  }

  // Crossbar, seen end on as a circle: reflect off its surface with some pace lost
  const dx = b.x;
  const dy = b.y - BAR_Y;
  const dist = Math.hypot(dx, dy);
  if (dist < BALL_R + BAR_R) {
    const nx = dx / dist;
    const ny = dy / dist;
    const along = b.vx * nx + b.vy * ny;
    if (along < 0) {
      b.vx -= 1.55 * along * nx;
      b.vy -= 1.55 * along * ny;
    }
    b.x = nx * (BALL_R + BAR_R);
    b.y = BAR_Y + ny * (BALL_R + BAR_R);
    if (f.barHit === null) f.barHit = f.t;
  }

  // Crossing the goal line under the bar is a goal; above it is over
  if (!f.outcome && prevX < 0 && b.x >= 0) {
    if (b.y < BAR_Y) {
      decide(f, f.barHit !== null ? 'barin' : b.y >= TOP_BINS ? 'topbins' : 'goal');
      if (f.tyre !== null && Math.abs(b.y - f.tyre) < TYRE_R - BALL_R) f.throughTyre = true;
    }
    else decide(f, 'over');
  }

  if (isGoal(f.outcome) && b.x > 0) {
    // Roof of the net keeps it in from above
    if (b.y + BALL_R > BAR_Y && b.x < NET_ROOF) {
      b.y = BAR_Y - BALL_R;
      b.vy = -Math.abs(b.vy) * 0.3;
    }
    // Back of the net: a slope from the end of the roof down to the grass
    const backX = NET_ROOF + (NET_DEPTH - NET_ROOF) * (1 - Math.min(1, b.y / BAR_Y));
    if (b.x + BALL_R > backX) {
      b.x = backX - BALL_R;
      if (b.vx > 0) {
        if (!f.netHit) f.netHit = { t: f.t, y: b.y };
        b.vx = -b.vx * 0.12;
        b.vy *= 0.5;
      }
    }
  } else if (f.outcome === 'over' && b.x > 0 && b.x < NET_ROOF + 0.1 && b.vy < 0 && b.y - BALL_R < BAR_Y && b.y > BAR_Y - 0.1) {
    // Dropping onto the roof of the net
    b.y = BAR_Y + BALL_R;
    b.vy = Math.abs(b.vy) * 0.35;
  }

  // Came back off the bar into play and never crossed: a miss off the woodwork
  if (!f.outcome && f.barHit !== null && b.vx < 0) decide(f, 'bar');

  const stopped = b.y <= BALL_R + 1e-6 && Math.abs(b.vx) < 0.25;
  if (!f.outcome && stopped) decide(f, f.barHit !== null ? 'bar' : 'short');
  if (f.settled > 1.1 || (f.outcome && stopped && f.settled > 0.5) || f.t > 6 || b.x > NET_DEPTH + 6) f.done = true;
}

/** Runs a whole kick without drawing, for tuning and tests */
export function simulate(setup: KickSetup | number, power: number): Flight {
  const f = createFlight(setup, power);
  while (!f.done) stepFlight(f, 1 / 60);
  return f;
}
