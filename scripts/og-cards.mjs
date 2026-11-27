// Link-preview cards (1200 by 630 PNG), one per page, drawn at build time in the walker's world: the title in
// Inter over a path, with the walker heading for that page's place, a bench for a post, a signpost for a
// project, a wave on the home card. Text is set as Inter's own outlines, so no font has to be installed.
// Called by scripts/prerender.mjs with the list from entry-server's cards()
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);
const fontFile = weight => require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`);
const regular = opentype.loadSync(fontFile(400));
const medium = opentype.loadSync(fontFile(500));

// The dark theme's tokens (src/index.css): the site's default appearance
const BG = '#040404';
const INK = '#ececec';
const MUTED = '#7a7a7a';

const W = 1200;
const H = 630;
const PAD = 80;
const GROUND = 548;
const S = 2.1; // the walker's 62-unit figure at about 130px tall

const width = (font, text, size) => font.getAdvanceWidth(text, size, { kerning: true });

/** Breaks text into at most `lines` lines that fit `max`, ending the last one with an ellipsis if it runs over */
function wrap(font, text, size, max, lines) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const out = [''];
  for (const word of words) {
    const next = out[out.length - 1] ? `${out[out.length - 1]} ${word}` : word;
    if (width(font, next, size) <= max || !out[out.length - 1]) out[out.length - 1] = next;
    else out.push(word);
  }
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  let last = kept[lines - 1];
  while (last && width(font, `${last}…`, size) > max) last = last.replace(/\s*\S+$/, '');
  kept[lines - 1] = `${last}…`;
  return kept;
}

const text = (font, value, x, y, size, fill) => `<path d="${font.getPath(value, x, y, size, { kerning: true }).toPathData(2)}" fill="${fill}"/>`;

/** The hero's figure, mid-stride or waving, standing on the ground line at x. Far limbs at 45%, as on the site */
function walker(x, pose = 'stride') {
  const near =
    pose === 'wave'
      ? 'M60 24 L67 17.5 L69.5 8.5'
      : 'M60 24 L56.6 32.4 L55.6 40.6';
  const farArm = pose === 'wave' ? 'M60 24 L57.5 32.6 L57 41' : 'M60 24 L63.6 32.4 L66.4 40';
  const legs =
    pose === 'wave'
      ? { near: 'M60 40 L62.4 51.8 L63.4 63.5', far: 'M60 40 L57.6 51.8 L56.6 63.5' }
      : { near: 'M60 40 L64.6 51.4 L67.6 63.5', far: 'M60 40 L56.8 51.8 L51.8 63.5' };
  return `<g transform="translate(${x - 60 * S} ${GROUND - 63.5 * S}) scale(${S})" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${farArm}" opacity="0.45"/><path d="${legs.far}" opacity="0.45"/>
    <circle cx="60" cy="13.5" r="5.5"/><path d="M60 19 L60 40"/>
    <path d="${legs.near}"/><path d="${near}"/>
  </g>`;
}

/** The reading path's bench under its street lamp, lit, as at the end of every post */
function bench(x) {
  const s = 2.9;
  return `<g transform="translate(${x} ${GROUND - 43 * s}) scale(${s})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="${INK}" stroke-width="0.9" stroke-dasharray="1.2 2.6" opacity="0.7"><path d="M45.4 11 L37 41 M47.4 11.4 L47.4 41 M49.4 11 L58 41"/></g>
    <g stroke="${MUTED}" stroke-width="1.2">
      <path d="M54 43 V7.5 Q54 3 49.5 3 H47.5"/><path d="M51.5 43 H56.5"/><path d="M44.6 3.6 H50.2 L49.2 8 H45.6 Z"/>
      <path d="M15 30.4 H43 M16 33 H42"/><path d="M17.5 33 L16 43 M40.5 33 L42.5 43"/>
      <path d="M40.5 30.4 L44.5 14.5 M42.4 22.4 L44 17"/><path d="M15 30.4 Q11 30 11.6 26.6 Q12.4 23.6 15.4 25.4"/>
    </g>
    <circle cx="47.4" cy="8.6" r="1.4" fill="${INK}"/>
  </g>`;
}

/** A trail signpost: a post with an arm pointing on along the path */
function signpost(x) {
  return `<g fill="none" stroke="${MUTED}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${x} ${GROUND} V${GROUND - 118}"/>
    <path d="M${x - 6} ${GROUND - 108} H${x + 62} L${x + 74} ${GROUND - 98} L${x + 62} ${GROUND - 88} H${x - 6} Z"/>
    <path d="M${x - 10} ${GROUND} H${x + 10}"/>
  </g>`;
}

function scene(kind) {
  const ground = `<defs><linearGradient id="fade"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.12" stop-color="#fff"/></linearGradient>
    <mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask></defs>
    <g mask="url(#m)" stroke="${MUTED}" stroke-linecap="round" fill="none">
      <path d="M0 ${GROUND} H${W - PAD}" stroke-width="2"/>
      <path d="M0 ${GROUND + 12} H${W - PAD}" stroke-width="2" stroke-dasharray="12 30"/>
    </g>`;
  if (kind === 'bench') return ground + walker(740) + bench(W - PAD - 175);
  if (kind === 'signpost') return ground + walker(820) + signpost(W - PAD - 140);
  return ground + walker(W - PAD - 120, 'wave');
}

export function card({ title, line, kind }) {
  const titleLines = wrap(medium, title, 66, W - PAD * 2, 2);
  const lineLines = wrap(regular, line, 28, W - PAD * 2, 2);
  const parts = [text(regular, 'mithun.fyi', PAD, 118, 26, MUTED)];
  titleLines.forEach((value, i) => parts.push(text(medium, value, PAD, 196 + i * 78, 66, INK)));
  // The line under the title starts one short step below its last baseline
  let y = 196 + (titleLines.length - 1) * 78 + 56;
  for (const value of lineLines) {
    parts.push(text(regular, value, PAD, y, 28, MUTED));
    y += 40;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${BG}"/>${parts.join('')}${scene(kind)}</svg>`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

export function writeCards(cards, dist) {
  for (const entry of cards) {
    const file = join(dist, entry.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, card(entry));
  }
  return cards.length;
}
