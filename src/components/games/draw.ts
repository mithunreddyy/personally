// Drawing shared by every game: one stick figure in the walker's proportions, the ball, and the
// walker's grass. World units are metres with y up; a View maps them onto the canvas in CSS pixels.

export type Pt = [number, number];

export interface Colors {
  ink: string;
  muted: string;
  bg: string;
}

export function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return { ink: get('--color-ink'), muted: get('--color-muted'), bg: get('--color-bg') };
}

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The walker's proportions in metres
export const HEAD_R = 0.17;
export const THIGH = 0.4;
export const SHIN = 0.38;
export const UPPER_ARM = 0.29;
export const FOREARM = 0.27;
export const HIP = 0.76;
export const TORSO = 0.52;

/** Two-bone reach: the middle joint for a limb from a to b, bending to one side (+1 or -1) */
export function joint(a: Pt, b: Pt, l1: number, l2: number, side: number): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const d = Math.min(len, l1 + l2 - 1e-4);
  const ux = dx / len;
  const uy = dy / len;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  return [a[0] + ux * along - uy * h * side, a[1] + uy * along + ux * h * side];
}

/** Clamp a target to what a limb of total length len can reach from its root */
export function reach(root: Pt, target: Pt, len: number): Pt {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d = Math.hypot(dx, dy);
  return d <= len ? target : [root[0] + (dx / d) * len, root[1] + (dy / d) * len];
}

export interface Pose {
  hip: Pt;
  /** Lean of the torso, in metres of shoulder offset along the facing direction */
  lean?: number;
  /** Near foot first, then the far one; same for hands */
  feet: [Pt, Pt];
  hands: [Pt, Pt];
  /** +1 facing right, -1 facing left */
  dir: number;
}

export interface Pen {
  ctx: CanvasRenderingContext2D;
  colors: Colors;
  /** Pixels per metre */
  s: number;
  lw: number;
  X: (x: number) => number;
  Y: (y: number) => number;
  line: (pts: Pt[], color: string, width?: number, alpha?: number) => void;
  figure: (pose: Pose, alpha?: number) => void;
  ball: (x: number, y: number, r: number, spin: number) => void;
  grass: (left: number, right: number, spacing?: number) => void;
}

/** A pen for one frame: world-to-canvas mapping plus the shared drawing routines */
export function makePen(ctx: CanvasRenderingContext2D, colors: Colors, s: number, left: number, groundY: number): Pen {
  const X = (x: number) => (x - left) * s;
  const Y = (y: number) => groundY - y * s;
  const lw = Math.min(2.2, Math.max(1.3, 0.06 * s));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const line = (pts: Pt[], color: string, width = lw, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const figure = (pose: Pose, alpha = 1) => {
    const { hip, dir, feet, hands } = pose;
    const lean = pose.lean ?? 0;
    const shoulder: Pt = [hip[0] + lean * dir, hip[1] + TORSO];
    const neck: Pt = [shoulder[0] + lean * 0.3 * dir, shoulder[1] + 0.13];
    const head: Pt = [neck[0], neck[1] + HEAD_R + 0.02];
    // Knees bend toward where he faces, elbows away from it
    const limb = (root: Pt, end: Pt, a: number, b: number, bend: number, a2: number) => {
      const tip = reach(root, end, a + b);
      line([root, joint(root, tip, a, b, bend), tip], colors.ink, lw, a2);
    };
    // Far side first and in half-tone, as the walker draws them
    limb(hip, feet[1], THIGH, SHIN, dir, 0.45 * alpha);
    limb(shoulder, hands[1], UPPER_ARM, FOREARM, -dir, 0.45 * alpha);
    line([hip, neck], colors.ink, lw, alpha);
    limb(hip, feet[0], THIGH, SHIN, dir, alpha);
    limb(shoulder, hands[0], UPPER_ARM, FOREARM, -dir, alpha);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = lw;
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.arc(X(head[0]), Y(head[1]), HEAD_R * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // An outline with one panel, turning with the spin
  const ball = (x: number, y: number, radius: number, spin: number) => {
    const r = Math.max(3.2, radius * s);
    const bx = X(x);
    const by = Math.min(Y(y), Y(0) - r);
    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(1.2, lw * 0.75);
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = spin + (i * Math.PI * 2) / 5;
      const px = bx + Math.cos(a) * r * 0.42;
      const py = by + Math.sin(a) * r * 0.42;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.fill();
  };

  // The walker's ground line and tufts, fixed to the world so a camera move reads as travel
  const grass = (left: number, right: number, spacing = 3.3) => {
    // A bad camera (zero scale, so an endless view) must never turn into an endless loop
    if (!Number.isFinite(left) || !Number.isFinite(right) || right - left > 2000) return;
    line([[left - 1, 0], [right + 1, 0]], colors.muted, 1);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(left / spacing) * spacing; x < right + spacing; x += spacing) {
      const tx = X(x + Math.sin(x * 7.1) * spacing * 0.27);
      const ty = Y(0);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 1.6, ty - 3.6);
      ctx.moveTo(tx + 2, ty);
      ctx.lineTo(tx + 2.4, ty - 4.6);
      ctx.moveTo(tx + 4, ty);
      ctx.lineTo(tx + 6, ty - 3.2);
    }
    ctx.stroke();
  };

  return { ctx, colors, s, lw, X, Y, line, figure, ball, grass };
}

/** A runner's or walker's legs and arms for a point in the stride, phase 0..1 per full cycle */
export function stridePose(x: number, phase: number, opts: { lift?: number; reachLen?: number; hipY?: number; arms?: number } = {}): Pose {
  const lift = opts.lift ?? 0.22;
  const len = opts.reachLen ?? 0.42;
  const hipY = opts.hipY ?? HIP;
  const arms = opts.arms ?? 0.35;
  const foot = (p: number): Pt => {
    const a = p * Math.PI * 2;
    // Forward half of the cycle the foot swings through the air; the back half it is planted
    const fx = -Math.cos(a) * len;
    const fy = Math.max(0, Math.sin(a)) * lift;
    return [x + fx, fy];
  };
  const hand = (p: number): Pt => [x - Math.cos(p * Math.PI * 2) * arms * 0.7, hipY + 0.2 + Math.abs(Math.sin(p * Math.PI * 2)) * 0.04];
  return {
    hip: [x, hipY + Math.abs(Math.sin(phase * Math.PI * 4)) * 0.03],
    dir: 1,
    lean: 0.06 + lift * 0.2,
    feet: [foot(phase), foot(phase + 0.5)],
    hands: [hand(phase + 0.5), hand(phase)],
  };
}

const BEST_PREFIX = 'games-best-';

export function readBest(id: string): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_PREFIX + id);
    return raw === null ? null : Number(raw) || 0;
  } catch {
    return null;
  }
}

export function saveBest(id: string, value: number) {
  try {
    window.localStorage.setItem(BEST_PREFIX + id, String(value));
  } catch {
    // Private windows can refuse storage; the best score then lasts only for this visit
  }
}

/**
 * The best score, kept live: as soon as a run passes it, the best climbs with the score and is saved
 * straight away, so a closed tab never loses it. offer() returns true once per run, at the moment an
 * earlier best is passed, so the game can say so
 */
export function liveBest(id: string) {
  return {
    value: null as number | null,
    /** The best when this run began */
    before: null as number | null,
    passed: false,
    load() {
      this.value = readBest(id);
      this.before = this.value;
    },
    begin() {
      this.before = this.value;
      this.passed = false;
    },
    offer(score: number) {
      if (score <= 0 || (this.value !== null && score <= this.value)) return false;
      this.value = score;
      saveBest(id, score);
      if (this.passed) return false;
      this.passed = true;
      return this.before !== null && this.before > 0;
    },
  };
}
