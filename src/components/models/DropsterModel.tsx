import { KeyboardEvent, useEffect, useRef, useState } from 'react';

// dropster's clover dial, redrawn: the geometry is CloverLayout.swift's, and the leaves, beads and captions
// are CloverMenu.swift's for one file of each kind. Beads the app draws as a symbol (sparkles, an eye) are
// left out, and so are presets, which depend on what someone has saved

const CORE = 32;
const INNER = CORE + 5;
const DISC = 104;
const LABEL = 70;
const BEAD = 23;
const ORBIT = 150;
const STEP = (2 * BEAD + 8) / ORBIT;
// Leaf 0 top-left, then clockwise (screen y points down)
const ANGLES = [(-3 * Math.PI) / 4, -Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4];

type Format = { ext: string; name: string };
const F: Record<string, Format> = {
  webp: { ext: 'WEBP', name: 'WebP' },
  avif: { ext: 'AVIF', name: 'AVIF' },
  jpeg: { ext: 'JPG', name: 'JPEG' },
  png: { ext: 'PNG', name: 'PNG' },
  heic: { ext: 'HEIC', name: 'HEIC' },
  tiff: { ext: 'TIFF', name: 'TIFF' },
  pdf: { ext: 'PDF', name: 'PDF' },
  svg: { ext: 'SVG', name: 'SVG' },
  gif: { ext: 'GIF', name: 'GIF' },
  ico: { ext: 'ICO', name: 'ICO' },
  icns: { ext: 'ICNS', name: 'macOS Icon' },
  bmp: { ext: 'BMP', name: 'BMP' },
  jp2: { ext: 'JP2', name: 'JPEG 2000' },
  mp4: { ext: 'MP4', name: 'MP4' },
  mov: { ext: 'MOV', name: 'QuickTime' },
  webm: { ext: 'WEBM', name: 'WebM' },
  mkv: { ext: 'MKV', name: 'Matroska' },
  mp3: { ext: 'MP3', name: 'MP3' },
  m4a: { ext: 'M4A', name: 'AAC (M4A)' },
  opus: { ext: 'OPUS', name: 'Opus' },
  flac: { ext: 'FLAC', name: 'FLAC' },
  wav: { ext: 'WAV', name: 'WAV' },
  aiff: { ext: 'AIFF', name: 'AIFF' },
};

type Bead = { label: string; caption: string };
type Leaf = { title: string; beads: Bead[] };

const FILES = '1 file';
// A file's own format is never offered as a conversion
const convert = (source: string, formats: string[]): Bead[] =>
  formats
    .filter(f => f !== source)
    .map(f => ({ label: F[f].ext, caption: `Convert to ${F[f].name} · ${FILES}` }));
const optimize: Bead[] = ['Smallest', 'Balanced', 'Fastest'].map(mode => ({
  label: mode.slice(0, 4).toUpperCase(),
  caption: `Optimize · ${mode} · ${FILES}`,
}));
const presets: Leaf = { title: 'Presets', beads: [] };

const image = (source: string): Leaf[] => [
  { title: 'Optimize', beads: optimize },
  { title: 'Web', beads: convert(source, ['webp', 'avif', 'jpeg', 'png']) },
  { title: 'Formats', beads: convert(source, ['heic', 'tiff', 'pdf', 'svg', 'gif', 'ico', 'icns', 'bmp', 'jp2']) },
  presets,
];

const KINDS: { id: string; name: string; leaves: Leaf[] }[] = [
  { id: 'jpeg', name: 'JPEG', leaves: image('jpeg') },
  { id: 'png', name: 'PNG', leaves: image('png') },
  {
    id: 'mp4',
    name: 'Video',
    leaves: [
      { title: 'Optimize', beads: optimize },
      { title: 'Video', beads: convert('mp4', ['mp4', 'mov', 'webm', 'mkv', 'gif']) },
      { title: 'Audio', beads: convert('mp4', ['mp3', 'm4a', 'opus', 'flac', 'wav']) },
      presets,
    ],
  },
  {
    id: 'mp3',
    name: 'Audio',
    leaves: [
      { title: 'Optimize', beads: optimize },
      { title: 'Compact', beads: convert('mp3', ['mp3', 'm4a', 'opus']) },
      { title: 'Lossless', beads: convert('mp3', ['flac', 'wav', 'aiff']) },
      presets,
    ],
  },
];

const IDLE = 'Rest on a leaf to see what it offers.';
const EMPTY = 'Not available for these files';
const point = (angle: number, r: number) => [Math.cos(angle) * r, Math.sin(angle) * r] as const;

/** A quarter of the ring from INNER to DISC, with a straight 5-unit gap to each neighbour */
function petal(mid: number) {
  const half = Math.PI / 4;
  const a0 = (r: number) => mid - half + 2.5 / r;
  const a1 = (r: number) => mid + half - 2.5 / r;
  const [ox0, oy0] = point(a0(DISC), DISC);
  const [ox1, oy1] = point(a1(DISC), DISC);
  const [ix1, iy1] = point(a1(INNER), INNER);
  const [ix0, iy0] = point(a0(INNER), INNER);
  return `M${ox0} ${oy0} A${DISC} ${DISC} 0 0 1 ${ox1} ${oy1} L${ix1} ${iy1} A${INNER} ${INNER} 0 0 0 ${ix0} ${iy0} Z`;
}

const press = (run: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    run();
  }
};

/** The dial for one file: rest on a leaf and its beads fan out; each bead names the action it would run */
export function DropsterModel() {
  const [kindId, setKindId] = useState('jpeg');
  const [open, setOpen] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const rest = useRef(0);
  const leaves = KINDS.find(k => k.id === kindId)!.leaves;

  useEffect(() => () => window.clearTimeout(rest.current), []);

  const pickKind = (id: string) => {
    setKindId(id);
    setOpen(null);
    setHint(null);
    setChosen(null);
  };

  const enterLeaf = (i: number) => {
    const leaf = leaves[i];
    // Dropping on the leaf itself would run its first bead
    setHint(leaf.beads[0]?.caption ?? EMPTY);
    window.clearTimeout(rest.current);
    // As in the app, resting on a leaf for 300ms fans its beads out
    if (leaf.beads.length > 1) rest.current = window.setTimeout(() => setOpen(i), 300);
  };

  const openLeaf = (i: number) => {
    window.clearTimeout(rest.current);
    setHint(leaves[i].beads[0]?.caption ?? EMPTY);
    setOpen(leaves[i].beads.length ? i : null);
  };

  const caption = hint ?? chosen ?? IDLE;

  return (
    <div className="model">
      <div className="model-controls">
        <span className="model-words" role="group" aria-label="File dragged onto the dial">
          {KINDS.map(k => (
            <button
              key={k.id}
              type="button"
              className="film-word model-word"
              aria-pressed={k.id === kindId}
              onClick={() => pickKind(k.id)}
            >
              {k.name}
            </button>
          ))}
        </span>
      </div>

      <div className="clover" onPointerLeave={() => setHint(null)}>
        <svg viewBox="-185 -185 370 370" role="group" aria-label={`The dial for one ${KINDS.find(k => k.id === kindId)!.name} file`}>
          <circle className="clover-bezel" r={DISC + 7} />
          {leaves.map((leaf, i) => {
            const mid = ANGLES[i];
            const [lx, ly] = point(mid, LABEL);
            const fan = open === i ? leaf.beads : [];
            const start = mid - (STEP * (fan.length - 1)) / 2;
            return (
              <g key={`${kindId}-${leaf.title}`}>
                <g
                  className="clover-leaf"
                  role="button"
                  tabIndex={0}
                  aria-expanded={leaf.beads.length > 1 ? open === i : undefined}
                  aria-disabled={leaf.beads.length === 0 || undefined}
                  aria-label={`${leaf.title}${leaf.beads.length ? `, ${leaf.beads.length} options` : ', not available'}`}
                  data-open={open === i || undefined}
                  data-off={leaf.beads.length === 0 || undefined}
                  onPointerEnter={() => enterLeaf(i)}
                  onPointerLeave={() => window.clearTimeout(rest.current)}
                  onFocus={() => setHint(leaf.beads[0]?.caption ?? EMPTY)}
                  onBlur={() => setHint(null)}
                  onClick={() => openLeaf(i)}
                  onKeyDown={press(() => openLeaf(i))}
                >
                  <path d={petal(mid)} />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central">
                    {leaf.title}
                  </text>
                </g>
                {fan.map((bead, j) => {
                  const [bx, by] = point(start + STEP * j, ORBIT);
                  return (
                    <g
                      key={bead.label}
                      className="clover-bead"
                      role="button"
                      tabIndex={0}
                      aria-label={bead.caption.replace(` · ${FILES}`, '')}
                      data-chosen={chosen === bead.caption || undefined}
                      onPointerEnter={() => setHint(bead.caption)}
                      onFocus={() => setHint(bead.caption)}
                      onBlur={() => setHint(null)}
                      onClick={() => setChosen(bead.caption)}
                      onKeyDown={press(() => setChosen(bead.caption))}
                    >
                      <circle cx={bx} cy={by} r={BEAD} />
                      {/* A larger, invisible circle so a fingertip finds the bead */}
                      <circle className="clover-hit" cx={bx} cy={by} r={BEAD + 4} />
                      <text x={bx} y={by} textAnchor="middle" dominantBaseline="central">
                        {bead.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          <circle className="clover-core" r={CORE} />
          <text className="clover-count" y={-5} textAnchor="middle" dominantBaseline="central">
            1
          </text>
          <text className="clover-files" y={14} textAnchor="middle" dominantBaseline="central">
            file
          </text>
        </svg>
        <p className="clover-caption" aria-live="polite">
          {caption}
        </p>
      </div>

      <p className="text-muted">
        A redrawing of the dial in SVG, with dropster’s own leaves, formats and captions. In the app it opens at
        the cursor while you hold ⌥ and drag, each leaf has a haptic detent, and dropping on a leaf runs its first
        bead. Symbol beads and saved presets are left out here.
      </p>
    </div>
  );
}
