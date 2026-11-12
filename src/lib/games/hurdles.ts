// Hurdles: he runs on his own, you hold to jump. A tap is a hop, a hold is a high jump: while the press
// is held on the way up, gravity is lighter, up to a limit. Metres and seconds, y up, x along the track.

const GRAVITY = 9.81 * 1.15;
const HOLD_GRAVITY = 9.81 * 0.42;
const MAX_HOLD = 0.3;
const TAKEOFF = 4.3;
const START_SPEED = 6;
const TOP_SPEED = 11.5;
const SPEED_RAMP = 80;
// Water jumps start here: a 91 cm barrier with a pit after it that only a long hold clears
const WATER_FROM = 110;
const WATER_BARRIER = 0.91;
export const PIT_START = 0.25;
// Pairs of low hurdles, a quick hop apart, start here
const DOUBLES_FROM = 190;
// Legs tuck over the bar, so the feet can pass a little under its height
export const TUCK = 0.12;
// Front of his stride to the back, for the bar check
const BODY_FRONT = 0.28;
const BODY_BACK = 0.22;
export const LIVES = 3;
// Real hurdle heights: 76, 84, 91 and 107 cm
const HEIGHTS = [0.76, 0.84, 0.91, 1.07];

export interface Hurdle {
  x: number;
  h: number;
  /** Length of the water pit after the barrier, 0 for a plain hurdle */
  pit: number;
  splashed: boolean;
  /** Set when he clips it: the time, and how far it has toppled (0 standing, 1 flat) */
  hit: number | null;
  fall: number;
  cleared: boolean;
}

export interface Race {
  x: number;
  y: number;
  vy: number;
  speed: number;
  holding: boolean;
  held: number;
  grounded: boolean;
  /** Stumble timer after a clip, during which he runs slower */
  stumble: number;
  lives: number;
  cleared: number;
  hurdles: Hurdle[];
  t: number;
  over: boolean;
  started: boolean;
  /** Seeded so a test can replay a course */
  seed: number;
}

function rand(r: Race) {
  // mulberry32
  r.seed = (r.seed + 0x6d2b79f5) | 0;
  let t = r.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createRace(seed = Math.floor(Math.random() * 2 ** 31)): Race {
  const r: Race = {
    x: 0,
    y: 0,
    vy: 0,
    speed: START_SPEED,
    holding: false,
    held: 0,
    grounded: true,
    stumble: 0,
    lives: LIVES,
    cleared: 0,
    hurdles: [],
    t: 0,
    over: false,
    started: false,
    seed,
  };
  spawnUntil(r, 40);
  return r;
}

/** Airtime of the highest jump at a given speed, in metres covered: the gap a hurdle needs after the last */
function jumpLength(speed: number) {
  return speed * 1.05;
}

function spawnUntil(r: Race, upTo: number) {
  const prev = r.hurdles[r.hurdles.length - 1];
  let last = prev ? prev.x + prev.pit : 14;
  let lastKind = prev ? (prev.pit ? 'water' : 'hurdle') : 'hurdle';
  while (last < upTo) {
    // Spacing scales with the speed he will be doing there, so every gap leaves room to land and take off.
    // It tightens as the race goes on
    const speed = speedAt(last);
    const squeeze = Math.max(0.15, 0.35 - last / 1500);
    const gap = jumpLength(speed) + speed * (squeeze + rand(r) * Math.max(0.45, 0.9 - last / 800));
    last += gap;
    const roll = rand(r);
    if (last > WATER_FROM && lastKind !== 'water' && roll < 0.2) {
      // The pit grows with the race, from 2.6 m to 3.6 m
      const pit = Math.min(3.6, 2.6 + (last - WATER_FROM) / 300);
      r.hurdles.push({ x: last, h: WATER_BARRIER, pit, splashed: false, hit: null, fall: 0, cleared: false });
      last += pit;
      lastKind = 'water';
      continue;
    }
    // Taller hurdles come in as the race goes on
    const pool = last < 60 ? 2 : last < 160 ? 3 : 4;
    r.hurdles.push({ x: last, h: HEIGHTS[Math.floor(rand(r) * pool)], pit: 0, splashed: false, hit: null, fall: 0, cleared: false });
    lastKind = 'hurdle';
    if (last > DOUBLES_FROM && roll > 0.72) {
      // A second low hurdle one quick hop later: a long hold over the first lands too late for it
      last += speed * 0.9 + 0.2;
      r.hurdles.push({ x: last, h: HEIGHTS[0], pit: 0, splashed: false, hit: null, fall: 0, cleared: false });
    }
  }
}

function speedAt(x: number) {
  return Math.min(TOP_SPEED, START_SPEED + x / SPEED_RAMP);
}

export function press(r: Race) {
  if (r.over) return;
  r.started = true;
  r.holding = true;
  if (r.grounded) {
    r.vy = TAKEOFF;
    r.grounded = false;
    r.held = 0;
  }
}

export function release(r: Race) {
  r.holding = false;
}

export type RaceEvent = 'cleared' | 'clipped' | 'splash' | 'over' | null;

const SUBSTEP = 1 / 240;

export function stepRace(r: Race, dt: number): RaceEvent {
  let event: RaceEvent = null;
  let left = Math.min(dt, 0.05);
  while (left > 1e-9) {
    const h = Math.min(SUBSTEP, left);
    left -= h;
    event = sub(r, h) ?? event;
  }
  return event;
}

function sub(r: Race, h: number): RaceEvent {
  r.t += h;
  let event: RaceEvent = null;
  for (const hurdle of r.hurdles) if (hurdle.hit !== null) hurdle.fall = Math.min(1, hurdle.fall + h * 5);
  if (!r.started || r.over) return null;

  r.stumble = Math.max(0, r.stumble - h);
  r.speed = speedAt(r.x) * (r.stumble > 0 ? 0.7 : 1);
  r.x += r.speed * h;

  if (!r.grounded) {
    const floaty = r.holding && r.vy > 0 && r.held < MAX_HOLD;
    if (floaty) r.held += h;
    r.vy -= (floaty ? HOLD_GRAVITY : GRAVITY) * h;
    r.y += r.vy * h;
    if (r.y <= 0) {
      r.y = 0;
      r.vy = 0;
      r.grounded = true;
    }
  }

  // Feet down inside a water pit is a splash: a life gone and a slow wade out
  if (r.grounded) {
    for (const hurdle of r.hurdles) {
      if (!hurdle.pit || hurdle.splashed) continue;
      const from = hurdle.x + PIT_START;
      if (r.x > from && r.x < from + hurdle.pit) {
        hurdle.splashed = true;
        r.lives -= 1;
        r.stumble = 0.8;
        if (r.lives <= 0) {
          r.over = true;
          return 'over';
        }
        event = 'splash';
      }
    }
  }

  for (const hurdle of r.hurdles) {
    if (hurdle.hit !== null || hurdle.cleared) continue;
    const front = r.x + BODY_FRONT;
    const back = r.x - BODY_BACK;
    if (front >= hurdle.x && back <= hurdle.x && r.y + TUCK < hurdle.h) {
      hurdle.hit = r.t;
      r.lives -= 1;
      r.stumble = 0.6;
      event = 'clipped';
      if (r.lives <= 0) {
        r.over = true;
        return 'over';
      }
    } else if (back > hurdle.x + hurdle.pit + (hurdle.pit ? PIT_START : 0)) {
      // A water jump counts once he is past the pit without a splash
      hurdle.cleared = true;
      if (!hurdle.splashed) {
        r.cleared += 1;
        event = event ?? 'cleared';
      }
    }
  }

  // Keep the course ahead of him and forget what's well behind
  spawnUntil(r, r.x + 60);
  while (r.hurdles.length && r.hurdles[0].x + r.hurdles[0].pit < r.x - 30) r.hurdles.shift();
  return event;
}

/** For tuning: the apex of a jump held for a given time */
export function apex(hold: number) {
  const r = createRace(1);
  r.hurdles = [];
  press(r);
  let top = 0;
  while (!r.grounded || r.t === 0) {
    if (r.t > hold) release(r);
    sub(r, SUBSTEP);
    top = Math.max(top, r.y);
    r.hurdles = [];
  }
  return { top, air: r.t };
}
