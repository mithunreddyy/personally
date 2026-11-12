// Kite: the walker walks right flying a kite on a fixed line. Hold to pull the line and the kite climbs
// with the wind; let go and it sinks. Keep it over the trees and under the birds. Metres and seconds.

export const LINE = 8;
export const HAND_Y = 1.25;
export const TOP = HAND_Y + LINE * 0.98;
const FLOOR = 0.55;
export const KITE_R = 0.32;
const START_WALK = 2;
const TOP_WALK = 3.6;
const DAMPING = 1.25;
// Birds fly faster the farther he walks
const BIRD_SPEED = 1.6;
const BIRD_SPEED_MAX = 3.2;
export const STRAIN_LIMIT = 1.2;
// Power lines start here: a sagging wire between two poles that the kite has to pass under
const WIRES_FROM = 70;
export const WIRE_SAG = 0.8;
// Past this point a storm sits over the path, its cloud base lowering the farther he goes
const STORM_FROM = 220;
const STORM_DEPTH = 3;

export interface Tree {
  x: number;
  h: number;
  /** Crown radius; the crown is a circle sitting on the trunk with its top at h */
  r: number;
}

export interface Bird {
  x: number;
  y: number;
  phase: number;
}

export interface Wire {
  a: number;
  b: number;
  /** Height at the poles; it sags WIRE_SAG lower at the middle */
  top: number;
}

export interface Flight {
  /** Where the walker is along the path */
  w: number;
  walk: number;
  ky: number;
  vy: number;
  holding: boolean;
  trees: Tree[];
  birds: Bird[];
  wires: Wire[];
  t: number;
  started: boolean;
  over: boolean;
  /** What brought it down */
  cause: 'tree' | 'bird' | 'ground' | 'line' | 'wire' | 'storm' | null;
  /** Builds while the line is pulled at full height; past the limit the line snaps */
  strain: number;
  seed: number;
  nextTree: number;
  nextFlock: number;
  nextWire: number;
}

function rand(f: Flight) {
  f.seed = (f.seed + 0x6d2b79f5) | 0;
  let t = f.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

/** Wind at a height and time: stronger aloft, with slow gusts that come and go, gustier the farther he walks */
export function wind(y: number, t: number, walked = 0) {
  return 0.78 + 0.22 * Math.min(1, y / TOP) + (0.3 + Math.min(0.25, walked / 800)) * noise(t * 0.32 + y * 0.05);
}

/** The wire's height at x, or null where there is no wire */
export function wireAt(f: Flight, x: number): number | null {
  for (const wire of f.wires) {
    if (x < wire.a || x > wire.b) continue;
    const u = (x - wire.a) / (wire.b - wire.a);
    return wire.top - WIRE_SAG * 4 * u * (1 - u);
  }
  return null;
}

/** The storm's cloud base at x: out of reach before the storm, then lowering, with a lumpy underside */
export function stormAt(x: number): number {
  const depth = Math.min(STORM_DEPTH, Math.max(0, (x - STORM_FROM) / 80));
  return TOP + 0.6 - depth + (depth > 0 ? 0.3 * Math.sin(x * 0.45) - 0.3 : 0);
}

/** The kite's horizontal distance downwind of the hand: the line pulls it in as it climbs */
export function kiteOffset(ky: number) {
  const rise = Math.min(LINE * 0.98, Math.max(0, ky - HAND_Y));
  return Math.sqrt(LINE * LINE - rise * rise) * 0.92 + 0.6;
}

export function createFlight(seed = Math.floor(Math.random() * 2 ** 31)): Flight {
  const f: Flight = {
    w: 0,
    walk: START_WALK,
    ky: 4.2,
    vy: 0,
    holding: false,
    trees: [],
    birds: [],
    wires: [],
    t: 0,
    started: false,
    over: false,
    cause: null,
    strain: 0,
    seed,
    nextTree: 16,
    nextFlock: 26,
    nextWire: WIRES_FROM,
  };
  spawn(f);
  return f;
}

function spawn(f: Flight) {
  const ahead = f.w + 40;
  // Wires are laid out first, a little further ahead, so the trees and birds can make room for them
  while (f.nextWire < ahead + 20) {
    const span = 12 + rand(f) * 5;
    f.wires.push({ a: f.nextWire, b: f.nextWire + span, top: 6.7 + rand(f) * 0.8 });
    f.nextWire += span + 30 + rand(f) * 30;
  }
  while (f.nextTree < ahead) {
    // Taller trees come in as the walk goes on, but always leave a way under a wire or the storm
    const x = f.nextTree;
    const wire = wireAt(f, x);
    const tallest = Math.min(6.3, 3.4 + x / 60, wire === null ? 99 : wire - 2.4, stormAt(x) - 2.8);
    const h = 2.2 + rand(f) * Math.max(0, tallest - 2.2);
    f.trees.push({ x: f.nextTree, h, r: 0.8 + h * 0.13 });
    f.nextTree += 7 + rand(f) * 9;
  }
  while (f.nextFlock < ahead) {
    // Birds fly toward him, so they meet the kite sooner than their spot suggests. Keep each flock at
    // least 2.6 m above any tree near where they will meet, so there is always a way through
    const meetX = f.nextFlock;
    const nearTrees = f.trees.filter(tr => Math.abs(tr.x - meetX) < 9).reduce((m, tr) => Math.max(m, tr.h), 0);
    const low = Math.max(5.2, nearTrees + 2.6);
    const high = Math.min(TOP, stormAt(meetX) - 0.9);
    const underWire = f.wires.some(wire => meetX > wire.a - 8 && meetX < wire.b + 8);
    if (low < high - 0.6 && !underWire) {
      const y = low + rand(f) * (high - low);
      const head = meetX + (f.nextFlock - f.w) * (birdSpeed(f) / f.walk);
      for (let i = 0; i < 3; i++) f.birds.push({ x: head + i * 0.9, y: y + (i % 2) * 0.35, phase: rand(f) * 6 });
    }
    f.nextFlock += 14 + rand(f) * 14;
  }
}

const birdSpeed = (f: Flight) => Math.min(BIRD_SPEED_MAX, BIRD_SPEED + f.w / 150);

export function press(f: Flight) {
  if (f.over) return;
  f.started = true;
  f.holding = true;
}

export function release(f: Flight) {
  f.holding = false;
}

const SUBSTEP = 1 / 120;

export function stepFlight(f: Flight, dt: number) {
  let left = Math.min(dt, 0.05);
  while (left > 1e-9) {
    const h = Math.min(SUBSTEP, left);
    left -= h;
    sub(f, h);
  }
}

function sub(f: Flight, h: number) {
  f.t += h;
  for (const b of f.birds) b.phase += h * 9;
  if (!f.started) return;
  if (f.over) {
    // A crashed kite flutters down
    f.vy = Math.max(-3, f.vy - 6 * h);
    f.ky = Math.max(0.1, f.ky + f.vy * h);
    return;
  }

  f.walk = Math.min(TOP_WALK, START_WALK + f.w / 120);
  f.w += f.walk * h;
  const birds = birdSpeed(f);
  for (const b of f.birds) b.x -= birds * h;

  const w = wind(f.ky, f.t, f.w);
  // Holding always climbs and letting go always sinks; the gusts only change how fast
  const accel = f.holding ? 2.6 + 4 * (w - 0.8) : -3 + 2 * (w - 0.8);
  f.vy += (accel - f.vy * DAMPING) * h;
  f.ky += f.vy * h;
  if (f.ky > TOP) {
    f.ky = TOP;
    f.vy = Math.min(0, f.vy);
  }
  f.strain = f.holding && f.ky >= TOP - 0.05 ? f.strain + h : Math.max(0, f.strain - h * 2);
  if (f.strain > STRAIN_LIMIT) return crash(f, 'line');

  const kx = f.w + kiteOffset(f.ky);
  if (f.ky < FLOOR) return crash(f, 'ground');
  for (const tr of f.trees) {
    const cy = tr.h - tr.r;
    if (Math.hypot(kx - tr.x, f.ky - cy) < tr.r + KITE_R) return crash(f, 'tree');
    if (Math.abs(kx - tr.x) < 0.12 + KITE_R && f.ky < cy) return crash(f, 'tree');
  }
  for (const b of f.birds) if (Math.hypot(kx - b.x, f.ky - b.y) < 0.38 + KITE_R) return crash(f, 'bird');
  const wire = wireAt(f, kx);
  if (wire !== null && f.ky + KITE_R * 0.6 > wire) return crash(f, 'wire');
  if (f.ky + KITE_R > stormAt(kx)) return crash(f, 'storm');

  spawn(f);
  f.trees = f.trees.filter(tr => tr.x > f.w - 20);
  f.birds = f.birds.filter(b => b.x > f.w - 20);
  f.wires = f.wires.filter(wire => wire.b > f.w - 20);
}

function crash(f: Flight, cause: Flight['cause']) {
  f.over = true;
  f.cause = cause;
  f.vy = 0;
}
