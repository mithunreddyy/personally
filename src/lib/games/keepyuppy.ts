// Keepy-uppy: juggle a ball with foot, knee, chest and head. Side view, metres and seconds, y up.
// A tap meets the ball with whichever part is at its height; how close the ball is to that part's
// sweet spot sets how straight and how high it goes back up.

export const BALL_R = 0.11;
// Stage half-width: the ball rebounds off the frame edges so a bad touch is a chase, not a loss
export const HALF_WIDTH = 3.3;
// Floatier than real gravity so the timing is learnable; it climbs with every touch
const GRAVITY = 9.81 * 0.6;
const GRAVITY_MAX = 9.81 * 0.95;
const GRAVITY_STEP = 1.012;
const RUN_SPEED = 3.4;
const RUN_ACCEL = 16;
// A tap within this long of the last one does nothing, so mashing can't stand in for timing
const COOLDOWN = 0.32;
export const TOUCH_TIME = 0.18;
const REACH_X = 0.5;

export type Part = 'foot' | 'knee' | 'chest' | 'head';
export const PART_ORDER: Part[] = ['foot', 'knee', 'chest', 'head'];

// From this many touches a part gets called out; meeting the ball with it is worth a bonus
const CALLS_FROM = 5;
const CALL_BONUS = 3;
// A call lasts this many touches before it lapses
const CALL_LIFE = 4;
// Side wind starts here and builds with every touch after
const WIND_FROM = 10;
const WIND_PER_TOUCH = 0.05;
const WIND_MAX = 1.8;
// Clean touches in a row raise the multiplier: x2 from 5, x3 from 10
export const COMBO_STEPS = [5, 10];

// Each part: the band of heights it covers, its sweet spot, and how hard it sends the ball back up
const PARTS: { part: Part; low: number; high: number; sweet: number; lift: number }[] = [
  { part: 'foot', low: 0.12, high: 0.62, sweet: 0.34, lift: 4.6 },
  { part: 'knee', low: 0.62, high: 1.15, sweet: 0.88, lift: 4.0 },
  { part: 'chest', low: 1.15, high: 1.5, sweet: 1.32, lift: 3.1 },
  { part: 'head', low: 1.5, high: 2.05, sweet: 1.78, lift: 3.6 },
];

export interface Juggle {
  ball: { x: number; y: number; vx: number; vy: number; spin: number };
  boy: { x: number; vx: number; dir: number };
  g: number;
  t: number;
  started: boolean;
  touches: number;
  points: number;
  /** The part being called for, and the touch it was called on */
  call: { part: Part; at: number } | null;
  /** Side wind strength in m/s^2, and its current push */
  windMax: number;
  wind: number;
  /** Clean touches in a row, and the most in a row this round */
  clean: number;
  bestClean: number;
  lastTap: number;
  /** The last touch, for the pose and the result line */
  touch: { part: Part; at: number; quality: number } | null;
  whiff: number | null;
  over: boolean;
  overAt: number;
}

export function createJuggle(): Juggle {
  return {
    ball: { x: 0.25, y: 1.25, vx: 0, vy: 0, spin: 0 },
    boy: { x: 0, vx: 0, dir: 1 },
    g: GRAVITY,
    t: 0,
    started: false,
    touches: 0,
    points: 0,
    call: null,
    windMax: 0,
    wind: 0,
    clean: 0,
    bestClean: 0,
    lastTap: -1,
    touch: null,
    whiff: null,
    over: false,
    overAt: 0,
  };
}

/** Where the ball will be when it next falls to height h, or null if it's already below */
function landingX(j: Juggle, h: number): number {
  const { x, y, vx, vy } = j.ball;
  // y + vy t - g t^2 / 2 = h  ->  the later root
  const disc = vy * vy + 2 * j.g * (y - h);
  if (disc < 0) return x;
  const t = (vy + Math.sqrt(disc)) / j.g;
  let lx = x + vx * Math.max(0, t);
  // Fold the path back in at the frame edges, where the ball rebounds
  const span = HALF_WIDTH * 2;
  lx = ((((lx + HALF_WIDTH) % (2 * span)) + 2 * span) % (2 * span));
  return (lx > span ? 2 * span - lx : lx) - HALF_WIDTH;
}

export type TapResult =
  | { kind: 'start' }
  | { kind: 'touch'; part: Part; clean: boolean; gained: number; called: boolean; multiplier: number }
  | { kind: 'whiff' }
  | { kind: 'ignored' };

export function multiplier(clean: number) {
  return 1 + COMBO_STEPS.filter(step => clean >= step).length;
}

// Smooth 1D value noise in -1..1, for the gusts
function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
function noise(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

export function tap(j: Juggle): TapResult {
  if (j.over) return { kind: 'ignored' };
  if (!j.started) {
    // The first tap drops the ball from his hands onto his foot
    j.started = true;
    j.ball.vy = 0.6;
    return { kind: 'start' };
  }
  if (j.t - j.lastTap < COOLDOWN) return { kind: 'ignored' };
  j.lastTap = j.t;
  const b = j.ball;
  const dx = b.x - j.boy.x;
  const zone = PARTS.find(p => b.y >= p.low && b.y < p.high);
  if (!zone || Math.abs(dx) > REACH_X || b.vy > 1.2) {
    j.whiff = j.t;
    return { kind: 'whiff' };
  }
  // Timing error: how far from the sweet spot, scaled to the band, and how far off to the side
  const half = (zone.high - zone.low) / 2;
  const errY = (b.y - zone.sweet) / half;
  const errX = dx / REACH_X;
  const quality = Math.max(0, 1 - Math.max(Math.abs(errY) * 0.7, Math.abs(errX) * 0.9));
  // Height keeps pace with gravity so a clean touch always gives the same hang time
  const lift = zone.lift * Math.sqrt(j.g / GRAVITY) * (0.72 + 0.28 * quality);
  b.vy = lift;
  // A late touch (ball low) pushes it forward, an early one back; off-centre contact squirts it sideways
  b.vx = b.vx * 0.25 + errX * 1.7 + errY * 0.9 * j.boy.dir;
  b.spin += errX * 3;
  j.touches += 1;
  const clean = quality > 0.72;
  j.clean = clean ? j.clean + 1 : 0;
  j.bestClean = Math.max(j.bestClean, j.clean);
  j.touch = { part: zone.part, at: j.t, quality };
  j.g = Math.min(GRAVITY_MAX, j.g * GRAVITY_STEP);

  // A touch is 1, a clean one 2, times the combo; meeting a called part adds a flat bonus
  const mult = multiplier(j.clean);
  const called = j.call?.part === zone.part;
  const gained = (clean ? 2 : 1) * mult + (called ? CALL_BONUS : 0);
  j.points += gained;
  if (called || (j.call && j.touches - j.call.at >= CALL_LIFE)) j.call = null;
  // Calls come more often the longer it goes, and never ask for the part that just played
  if (!j.call && j.touches >= CALLS_FROM && hash(j.touches * 3.7 + j.t) > 0.1 - Math.min(0.6, j.touches / 80)) {
    const options = PART_ORDER.filter(part => part !== zone.part);
    j.call = { part: options[Math.floor(((hash(j.touches * 9.1) + 1) / 2) * options.length) % options.length], at: j.touches };
  }
  if (j.touches >= WIND_FROM) j.windMax = Math.min(WIND_MAX, (j.touches - WIND_FROM + 1) * WIND_PER_TOUCH);
  return { kind: 'touch', part: zone.part, clean, gained, called, multiplier: mult };
}

const SUBSTEP = 1 / 240;

export function stepJuggle(j: Juggle, dt: number) {
  let left = Math.min(dt, 0.05);
  while (left > 1e-9) {
    const h = Math.min(SUBSTEP, left);
    left -= h;
    sub(j, h);
  }
}

function sub(j: Juggle, h: number) {
  j.t += h;
  const b = j.ball;
  const boy = j.boy;
  if (!j.started) return;

  if (!j.over) {
    // Gusts push the ball sideways, slowly changing strength and side
    j.wind = j.windMax * noise(j.t * 0.45);
    b.vx += j.wind * h;
    b.vy -= j.g * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.spin += b.vx * h * 3;
    if (Math.abs(b.x) > HALF_WIDTH) {
      b.x = Math.sign(b.x) * HALF_WIDTH;
      b.vx = -b.vx * 0.6;
    }
    if (b.y <= BALL_R) {
      b.y = BALL_R;
      j.over = true;
      j.overAt = j.t;
      b.vy = Math.abs(b.vy) * 0.35;
    }
  } else {
    // A couple of dying bounces once it's down
    b.vy -= j.g * h;
    b.y += b.vy * h;
    b.x += b.vx * h;
    b.vx *= 1 - 2 * h;
    if (b.y < BALL_R) {
      b.y = BALL_R;
      b.vy = Math.abs(b.vy) > 0.6 ? Math.abs(b.vy) * 0.4 : 0;
    }
    if (Math.abs(b.x) > HALF_WIDTH) b.vx = -b.vx;
  }

  // He steps to where the ball will come down to knee height, standing a touch behind it
  const target = j.over ? boy.x : Math.max(-HALF_WIDTH + 0.4, Math.min(HALF_WIDTH - 0.4, landingX(j, 0.8)));
  const want = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, (target - boy.x) * 6));
  const dv = Math.max(-RUN_ACCEL * h, Math.min(RUN_ACCEL * h, want - boy.vx));
  boy.vx += dv;
  boy.x += boy.vx * h;
  if (Math.abs(boy.vx) > 0.3) boy.dir = Math.sign(boy.vx);
}

/** Runs a juggle with taps at a fixed offset from each part's sweet spot, for tuning */
export function autoplay(offset: number, maxTouches = 200): number {
  const j = createJuggle();
  tap(j);
  let armed = true;
  while (!j.over && j.touches < maxTouches && j.t < 600) {
    stepJuggle(j, 1 / 120);
    const zone = PARTS[1];
    if (j.ball.vy < 0 && armed && j.ball.y <= zone.sweet + offset) {
      tap(j);
      armed = false;
    }
    if (j.ball.vy > 0) armed = true;
  }
  return j.touches;
}
