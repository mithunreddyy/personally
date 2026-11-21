// nook's tiling rules, ported from its Swift source (github.com/mithunreddyy/nook, Sources/NookKit) for the
// case study's model: the layout trees (Layout.swift `Layouts.tree`, standard screens), placement with gaps
// (Solver.swift `place`), and the tile list with stacking and refill (ScreenModel.swift). No DOM here.

export type LayoutKind = 'grid' | 'columns' | 'rows' | 'side';
type Axis = 'horizontal' | 'vertical'; // horizontal: side by side
type SplitNode = { leaf: number } | { axis: Axis; children: SplitNode[]; weights: number[] };
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The work area the model lays out: a 1440 by 900 screen, nook's default 8-point gap */
export const SCREEN = { width: 1440, height: 900, gap: 8 };
const MAIN = 0.5; // the "Half" main-window size

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** `Layouts.capacity` for a standard screen of this size */
export function capacity(kind: LayoutKind): number {
  switch (kind) {
    case 'grid':
      return 4;
    case 'columns':
      return clamp(Math.floor(SCREEN.width / 450), 1, 4);
    case 'rows':
      return clamp(Math.floor(SCREEN.height / 400), 1, 3);
    case 'side':
      return 1 + clamp(Math.floor(SCREEN.height / 400), 1, 3);
  }
}

const leaves = (from: number, to: number): SplitNode[] => Array.from({ length: to - from }, (_, i) => ({ leaf: from + i }));
const equal = (k: number) => Array<number>(k).fill(1 / k);
const rest = (k: number) => Array<number>(k).fill((1 - MAIN) / k);

/** `Layouts.tree` for a standard (landscape, not ultrawide) screen */
export function tree(kind: LayoutKind, n: number): SplitNode {
  if (n === 1) return { leaf: 0 };
  switch (kind) {
    case 'grid':
      if (n === 2) return { axis: 'horizontal', children: leaves(0, 2), weights: [MAIN, 1 - MAIN] };
      if (n === 3)
        return {
          axis: 'horizontal',
          children: [{ leaf: 0 }, { axis: 'vertical', children: leaves(1, 3), weights: equal(2) }],
          weights: [MAIN, 1 - MAIN],
        };
      return {
        axis: 'horizontal',
        children: [
          { axis: 'vertical', children: [{ leaf: 0 }, { leaf: 3 }], weights: equal(2) },
          { axis: 'vertical', children: [{ leaf: 1 }, { leaf: 2 }], weights: equal(2) },
        ],
        weights: [MAIN, 1 - MAIN],
      };
    case 'columns':
      return { axis: 'horizontal', children: leaves(0, n), weights: [MAIN, ...rest(n - 1)] };
    case 'rows':
      return { axis: 'vertical', children: leaves(0, n), weights: [MAIN, ...rest(n - 1)] };
    case 'side':
      if (n === 2) return { axis: 'horizontal', children: leaves(0, 2), weights: [MAIN, 1 - MAIN] };
      return {
        axis: 'horizontal',
        children: [{ leaf: 0 }, { axis: 'vertical', children: leaves(1, n), weights: equal(n - 1) }],
        weights: [MAIN, 1 - MAIN],
      };
  }
}

/**
 * `Solver.place` without per-app minimum sizes: on this screen every tile is above nook's 200 by 140 floor,
 * so `distribute` returns the plain weighted split
 */
export function frames(kind: LayoutKind, n: number): Frame[] {
  const out: Frame[] = [];
  const place = (node: SplitNode, r: Frame) => {
    if ('leaf' in node) {
      out[node.leaf] = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
      return;
    }
    const across = node.axis === 'horizontal';
    const total = (across ? r.width : r.height) - SCREEN.gap * (node.children.length - 1);
    const sum = node.weights.reduce((a, b) => a + b, 0);
    let cursor = across ? r.x : r.y;
    node.children.forEach((child, i) => {
      const length = (total * node.weights[i]) / sum;
      place(child, across ? { x: cursor, y: r.y, width: length, height: r.height } : { x: r.x, y: cursor, width: r.width, height: length });
      cursor += length + SCREEN.gap;
    });
  };
  if (n > 0) place(tree(kind, n), { x: 0, y: 0, width: SCREEN.width, height: SCREEN.height });
  return out;
}

/** A tile holds a stack of windows; the last one is the one showing. Tile 0 is the main window */
export interface Screen {
  kind: LayoutKind;
  tiles: number[][];
  active: number;
}

/** `ScreenModel.add` with the default placement (the end) and overflow (stack onto the active tile) */
export function add(s: Screen, window: number): Screen {
  const tiles = s.tiles.map(t => [...t]);
  if (tiles.length < capacity(s.kind)) {
    tiles.push([window]);
    return { ...s, tiles, active: tiles.length - 1 };
  }
  const at = clamp(s.active, 0, tiles.length - 1);
  tiles[at].push(window);
  return { ...s, tiles, active: at };
}

/** `ScreenModel.refill`: while there is room, the largest stack gives up its least recently shown window */
function refill(tiles: number[][], cap: number) {
  while (tiles.length < cap) {
    let largest = -1;
    tiles.forEach((t, i) => {
      if (t.length > 1 && (largest < 0 || t.length > tiles[largest].length)) largest = i;
    });
    if (largest < 0) break;
    tiles.push([tiles[largest].shift()!]);
  }
}

/** `ScreenModel.remove`: the window leaves its tile, an empty tile goes, and the rest refill and retile */
export function remove(s: Screen, window: number): Screen {
  const tiles = s.tiles.map(t => t.filter(w => w !== window)).filter(t => t.length > 0);
  refill(tiles, capacity(s.kind));
  return { ...s, tiles, active: clamp(s.active, 0, Math.max(tiles.length - 1, 0)) };
}

/** Switching layout: extra tiles merge into the one before them (`setCapacity`), or stacks refill new room */
export function relayout(s: Screen, kind: LayoutKind): Screen {
  const tiles = s.tiles.map(t => [...t]);
  const cap = capacity(kind);
  while (tiles.length > cap) {
    const last = tiles.pop()!;
    // The removed tile's showing window stays on top of the merged stack
    tiles[tiles.length - 1] = [...tiles[tiles.length - 1], ...last];
  }
  refill(tiles, cap);
  return { kind, tiles, active: clamp(s.active, 0, Math.max(tiles.length - 1, 0)) };
}
