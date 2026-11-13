import { Colors, reducedMotion } from './draw';

// Cumulus clouds for a game's sky, in the walker's lines: a muted outline over the page colour, a flat
// base under billowing tops, a faint shadow along the underside, and the seams where one billow sits
// in front of another. Each cloud is built from overlapping puffs, from a fixed seed, so every cloud has
// its own shape and keeps it. Far clouds are small, faint and slow and shift least as the camera moves;
// near ones are larger, firmer and cover them

type Puff = { x: number; y: number; r: number };

interface Cloud {
  puffs: Puff[];
  /** The flat base, from the first base puff's centre to the last */
  base: [number, number];
  height: number;
  /** Share of a lap where it starts, and its base line as a share of the stage height */
  at: number;
  y: number;
  /** Pixels per unit at a 700px stage, drift in px/s, outline strength, and how much it shifts per metre the camera moves */
  scale: number;
  speed: number;
  alpha: number;
  parallax: number;
}

// A small seeded generator, so each cloud keeps its shape on every frame and every visit
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A flat row of small puffs on the base, then tiers of larger billows heaped on it, each tier higher and
 * narrower, around a tower that sits off centre. The ends taper to small trailing puffs, as a cumulus does
 */
function shape(seed: number, span: number): Pick<Cloud, 'puffs' | 'base' | 'height'> {
  const rand = seeded(seed);
  const peak = 0.3 + rand() * 0.4;
  // 1 under the tower, falling away to the ends
  const swell = (t: number) => Math.max(0, 1 - Math.abs(t - peak) / Math.max(peak, 1 - peak));
  const puffs: Puff[] = [];
  for (let x = 0; x < span; ) {
    const r = 0.14 + 0.2 * swell(x / span) + rand() * 0.05;
    puffs.push({ x, y: -r, r });
    x += r * (1 + rand() * 0.35);
  }
  const last = puffs[puffs.length - 1].x;
  for (let tier = 0; tier < 3; tier++) {
    const count = Math.max(1, Math.round(last * (1.5 - tier * 0.45)));
    const reach = 1 - tier * 0.28;
    for (let i = 0; i < count; i++) {
      const t = peak + ((i + 0.5) / count - 0.5) * reach + (rand() - 0.5) * 0.08;
      const s = swell(t);
      if (s < 0.3 + tier * 0.18) continue;
      const r = (0.2 + 0.3 * s) * (1 - tier * 0.1) + rand() * 0.06;
      // Each tier lifted by less than a puff, so every billow stays joined to the one under it
      puffs.push({ x: t * last, y: -r - 0.08 - tier * 0.3 * s, r });
    }
  }
  const height = Math.max(...puffs.map(p => p.r - p.y));
  return { puffs, base: [0, last], height };
}

const CLOUDS: Cloud[] = [
  // Far: high, small and faint
  { ...shape(11, 3), at: 0.05, y: 0.15, scale: 16, speed: 3.5, alpha: 0.3, parallax: 1.5 },
  { ...shape(23, 2.2), at: 0.58, y: 0.25, scale: 13, speed: 3, alpha: 0.28, parallax: 1.2 },
  // Middle distance
  { ...shape(5, 2.8), at: 0.32, y: 0.38, scale: 22, speed: 6, alpha: 0.48, parallax: 3 },
  // Near: the largest, the one the eye takes first
  { ...shape(42, 4), at: 0.78, y: 0.3, scale: 30, speed: 9, alpha: 0.7, parallax: 5 },
];

/** The muted token as an rgba with the given alpha, for the underside shadow; other colour forms get none */
function tint(color: string, alpha: number) {
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return null;
  const n = parseInt(hex, 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * The sky behind every game. `sky` gives each game its own arrangement, so the four don't share one
 * stamped sky; `camLeft` is the camera's left edge in metres, for parallax; `strength` fades the whole
 * sky where the game's own sky carries play (Kite's gusts and storm). Under reduced motion the clouds
 * hold still
 */
export function drawClouds(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  colors: Colors,
  now: number,
  { sky = 0, camLeft = 0, strength = 1 }: { sky?: number; camLeft?: number; strength?: number } = {},
) {
  const line = colors.muted;
  const bg = colors.bg;
  const fit = Math.max(0.6, W / 700);
  const seconds = reducedMotion() ? 0 : now / 1000;
  CLOUDS.forEach((cloud, i) => {
    // Each sky moves every cloud along its lap and a little up or down, by an amount fixed per game
    const shift = seeded(sky * 97 + i * 13);
    const c = { ...cloud, at: (cloud.at + sky * 0.37 + shift() * 0.3) % 1, y: cloud.y + (shift() - 0.5) * 0.08, alpha: cloud.alpha * strength };
    const k = c.scale * fit;
    const wide = (c.base[1] + 1) * k;
    const lap = W + wide;
    const x = ((((c.at * lap + seconds * c.speed * fit - camLeft * c.parallax) % lap) + lap) % lap) - wide + 0.5 * k;

    // The body: every puff plus the slab under them, which gives the flat base. Puffs swell and settle a
    // touch, out of step with each other, as a real cloud's billows do
    const body = new Path2D();
    c.puffs.forEach((p, i) => {
      const r = p.r * (1 + 0.03 * Math.sin(seconds * 0.5 + i * 1.7));
      body.moveTo(p.x + r, p.y);
      body.arc(p.x, p.y, r, 0, Math.PI * 2);
    });
    const slab = Math.min(c.puffs[0].r, 0.12);
    body.rect(c.base[0], -slab, c.base[1] - c.base[0], slab);

    ctx.save();
    ctx.translate(x, c.y * H);
    ctx.scale(k, k);
    const lw = (c.alpha > 0.5 ? 1 : 0.8) / k;

    // Outline: stroke the union at double width, then fill it with the page colour, so only the outer
    // half of the line is left and the puffs read as one cloud. The fill also hides any cloud behind it
    ctx.globalAlpha = c.alpha;
    ctx.strokeStyle = line;
    ctx.lineWidth = lw * 2;
    ctx.stroke(body);
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fill(body);

    ctx.clip(body);
    // Underside shadow: the base is the part of a cumulus away from the sun
    const shadow = tint(line, 0.16 * c.alpha);
    const clear = tint(line, 0);
    if (shadow && clear) {
      const fade = ctx.createLinearGradient(0, 0, 0, -c.height * 0.55);
      fade.addColorStop(0, shadow);
      fade.addColorStop(1, clear);
      ctx.fillStyle = fade;
      ctx.fillRect(c.base[0] - 1, -c.height, c.base[1] + 2, c.height);
    }
    // Seams: where a billow sits in front of a higher one, the top of the front billow shows as a soft line
    ctx.globalAlpha = c.alpha * 0.35;
    ctx.lineWidth = lw;
    ctx.beginPath();
    const behind = (x: number, y: number, self: Puff) =>
      c.puffs.some(q => q !== self && q.y < self.y - 0.05 && (x - q.x) ** 2 + (y - q.y) ** 2 < (q.r * 0.92) ** 2);
    for (const p of c.puffs) {
      const from = Math.PI * 1.15;
      const to = Math.PI * 1.55;
      const mid = (from + to) / 2;
      // Only the larger billows, so the cloud keeps a few clear folds rather than a busy texture
      if (p.r < 0.3 || !behind(p.x + p.r * Math.cos(mid), p.y + p.r * Math.sin(mid), p)) continue;
      ctx.moveTo(p.x + p.r * Math.cos(from), p.y + p.r * Math.sin(from));
      ctx.arc(p.x, p.y, p.r, from, to);
    }
    ctx.stroke();
    ctx.restore();
  });
}
