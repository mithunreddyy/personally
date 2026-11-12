import '@fontsource/geist-mono/latin-400.css';

import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Inspect mode: Figma's Dev Mode on the site itself. Hover (or tab to) anything to read its spec, built
// from the page's real computed styles and the design tokens; click to pin it, then hover something else
// to measure the space between the two. Everything shown is read from the live page, nothing is staged.

const TOKENS = ['ink', 'body', 'muted', 'line', 'accent', 'bg', 'redline'] as const;

// The type sizes DESIGN.md names, keyed "size/line-height" in px
const TYPE_NAMES: Record<string, string> = {
  '15/23': 'body',
  '14/22': 'greeting',
  '13.5/19': 'row detail, narrow',
  '13/19': 'contents rail',
  '11/20': 'clock',
  '10.5/20': 'clock',
  '12/12': 'keycap',
  '26/31': 'case title',
  '22/27': 'case title',
  '18/27': 'case lead',
  '17/25': 'case lead',
};

type Rgba = [number, number, number, number];

function parseColor(value: string): Rgba | null {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(n => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

const hex = ([r, g, b]: Rgba) => `#${[r, g, b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`;

function over(top: Rgba, under: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
}

function luminance([r, g, b]: Rgba) {
  const c = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: Rgba, b: Rgba) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The colour actually behind an element: its own background and its ancestors', layered down to the page */
function backdrop(el: Element): Rgba {
  const layers: Rgba[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    const c = parseColor(getComputedStyle(node).backgroundColor);
    if (c && c[3] > 0) {
      layers.push(c);
      if (c[3] >= 1) break;
    }
  }
  let base: Rgba = layers.length && layers[layers.length - 1][3] >= 1 ? layers.pop()! : [255, 255, 255, 1];
  for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
  return base;
}

/** Each token's colour as the browser resolves it right now, so the match follows the theme */
function resolveTokens(): { name: string; rgba: Rgba }[] {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const out = TOKENS.flatMap(name => {
    probe.style.color = `var(--color-${name})`;
    const rgba = parseColor(getComputedStyle(probe).color);
    return rgba ? [{ name: `--color-${name}`, rgba }] : [];
  });
  probe.remove();
  return out;
}

function tokenFor(color: Rgba, tokens: { name: string; rgba: Rgba }[]) {
  const hit = tokens.find(t => t.rgba.every((v, i) => Math.abs(v - color[i]) < (i === 3 ? 0.02 : 1.5)));
  return hit?.name ?? null;
}

const px = (v: string) => Math.round(parseFloat(v) * 10) / 10;

function boxSides(cs: CSSStyleDeclaration, prop: 'padding' | 'margin') {
  const sides = (['Top', 'Right', 'Bottom', 'Left'] as const).map(s => px(cs[`${prop}${s}` as 'paddingTop']));
  if (sides.every(v => v === 0)) return null;
  const [t, r, b, l] = sides;
  if (t === b && r === l) return t === r ? `${t}` : `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

/** Whether the element holds text of its own, so type and colour rows mean something */
function hasText(el: Element) {
  return [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
}

interface Spec {
  name: string;
  size: string;
  rows: [string, string][];
  /** One line for screen readers */
  summary: string;
}

function readSpec(el: Element, tokens: { name: string; rgba: Rgba }[]): Spec {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const tag = el.tagName.toLowerCase();
  const size = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
  const rows: [string, string][] = [];
  const said: string[] = [tag, `${Math.round(rect.width)} by ${Math.round(rect.height)}`];

  const padding = boxSides(cs, 'padding');
  if (padding) rows.push(['padding', padding]);
  const margin = boxSides(cs, 'margin');
  if (margin) rows.push(['margin', margin]);
  if (cs.display.includes('flex') || cs.display.includes('grid')) {
    const gap = px(cs.rowGap) || px(cs.columnGap);
    if (gap) rows.push(['gap', `${gap}`]);
  }

  if (hasText(el) || /^(p|h\d|a|button|li|span|kbd|time|label)$/.test(tag)) {
    const fs = px(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? Math.round(fs * 1.2) : px(cs.lineHeight);
    const named = TYPE_NAMES[`${fs}/${lh}`];
    const family = cs.fontFamily.split(',')[0].replace(/["']/g, '').replace(' Variable', '');
    rows.push(['type', `${fs} / ${lh}${named ? `  ${named}` : ''}`]);
    rows.push(['font', `${family} ${cs.fontWeight}`]);
    const color = parseColor(cs.color);
    if (color) {
      const bg = backdrop(el);
      const fg = color[3] < 1 ? over(color, bg) : color;
      const ratio = contrast(fg, bg);
      const large = fs >= 18.66 || (fs >= 14 && Number(cs.fontWeight) >= 700);
      const grade = ratio >= (large ? 4.5 : 7) ? 'AAA' : ratio >= (large ? 3 : 4.5) ? 'AA' : 'fails AA';
      const token = tokenFor(color, tokens);
      rows.push(['colour', `${token ?? hex(color)}${token ? `  ${hex(color)}` : ''}`]);
      rows.push(['contrast', `${ratio.toFixed(1)}:1  ${grade}`]);
      said.push(`${fs} over ${lh}${named ? `, ${named}` : ''}`, token ?? hex(color), `contrast ${ratio.toFixed(1)} to 1, ${grade}`);
    }
  }

  const bgColor = parseColor(cs.backgroundColor);
  if (bgColor && bgColor[3] > 0) rows.push(['fill', tokenFor(bgColor, tokens) ?? hex(bgColor)]);
  if (px(cs.borderTopWidth) > 0) {
    const bc = parseColor(cs.borderTopColor);
    rows.push(['border', `${px(cs.borderTopWidth)}  ${bc ? (tokenFor(bc, tokens) ?? hex(bc)) : cs.borderTopColor}`]);
  }
  if (cs.borderRadius && cs.borderRadius !== '0px') rows.push(['radius', cs.borderRadius]);

  return { name: tag, size, rows, summary: said.join(', ') };
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: number;
}

/** Figma-style measurement between two boxes: the gaps between them, or from an inner box to its container */
function measure(a: DOMRect, b: DOMRect): Segment[] {
  const out: Segment[] = [];
  const inside = (i: DOMRect, o: DOMRect) => i.left >= o.left && i.right <= o.right && i.top >= o.top && i.bottom <= o.bottom;
  const contained = inside(b, a) ? [b, a] : inside(a, b) ? [a, b] : null;
  if (contained) {
    const [i, o] = contained;
    const cx = i.left + i.width / 2;
    const cy = i.top + i.height / 2;
    out.push({ x1: cx, y1: o.top, x2: cx, y2: i.top, label: i.top - o.top });
    out.push({ x1: cx, y1: i.bottom, x2: cx, y2: o.bottom, label: o.bottom - i.bottom });
    out.push({ x1: o.left, y1: cy, x2: i.left, y2: cy, label: i.left - o.left });
    out.push({ x1: i.right, y1: cy, x2: o.right, y2: cy, label: o.right - i.right });
    return out.filter(s => s.label >= 0.5);
  }
  // Vertical gap, drawn through the middle of where the two overlap side to side (or the hovered box's middle)
  const ox1 = Math.max(a.left, b.left);
  const ox2 = Math.min(a.right, b.right);
  const x = ox2 > ox1 ? (ox1 + ox2) / 2 : b.left + b.width / 2;
  if (b.top >= a.bottom) out.push({ x1: x, y1: a.bottom, x2: x, y2: b.top, label: b.top - a.bottom });
  else if (a.top >= b.bottom) out.push({ x1: x, y1: b.bottom, x2: x, y2: a.top, label: a.top - b.bottom });
  const oy1 = Math.max(a.top, b.top);
  const oy2 = Math.min(a.bottom, b.bottom);
  const y = oy2 > oy1 ? (oy1 + oy2) / 2 : b.top + b.height / 2;
  if (b.left >= a.right) out.push({ x1: a.right, y1: y, x2: b.left, y2: y, label: b.left - a.right });
  else if (a.left >= b.right) out.push({ x1: b.right, y1: y, x2: a.left, y2: y, label: a.left - b.right });
  return out.filter(s => s.label >= 0.5);
}

/** The element worth inspecting under a point: the whole SVG rather than one of its strokes */
function pick(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('[data-inspector]')) return null;
  let el: Element = target;
  while (el instanceof SVGElement && el.parentElement instanceof SVGElement) el = el.parentElement;
  if (el === document.documentElement || el === document.body) return null;
  return el;
}

const CARD_W = 256;

export default function Inspector({ onExit }: { onExit: () => void }) {
  const [hovered, setHovered] = useState<Element | null>(null);
  const [pinned, setPinned] = useState<Element | null>(null);
  const [said, setSaid] = useState('');
  // Bumped on scroll and resize so the outlines follow the page
  const [, setFrame] = useState(0);
  const tokens = useRef(resolveTokens());
  const lastPointer = useRef('mouse');
  // The pinned element as the event handlers see it, without re-binding them on every pin
  const pinnedRef = useRef<Element | null>(null);
  const pin = useCallback((el: Element | null) => {
    pinnedRef.current = el;
    setPinned(el);
  }, []);

  const announceSpec = useCallback((el: Element, prefix: string) => {
    setSaid(`${prefix} ${readSpec(el, tokens.current).summary}`);
  }, []);

  useEffect(() => {
    let raf = 0;
    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setFrame(f => f + 1));
    };
    const onMove = (e: PointerEvent) => {
      lastPointer.current = e.pointerType;
      if (e.pointerType === 'touch') return;
      setHovered(pick(e.target));
    };
    // The page's own buttons, links and game stages don't act while inspecting; only the inspector does
    const swallow = (e: Event) => {
      // A tap starts with a press, not a move, so this is where touch is told apart from a mouse
      if (e instanceof PointerEvent) lastPointer.current = e.pointerType;
      if (e.target instanceof Element && e.target.closest('[data-inspector]')) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-inspector]')) return;
      swallow(e);
      const el = pick(e.target);
      const current = pinnedRef.current;
      if (!el || el === current) {
        pin(null);
        setSaid(el ? 'Unpinned' : '');
        return;
      }
      // On touch, a tap on something else while one element is pinned measures to it instead
      if (current && lastPointer.current === 'touch') {
        setHovered(el);
        announceSpec(el, 'Measuring to');
        return;
      }
      pin(el);
      setHovered(null);
      announceSpec(el, 'Pinned');
    };
    const onKey = (e: KeyboardEvent) => {
      // With the command menu open, Esc is the menu's: it closes the menu and inspecting carries on
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        onExit();
      }
    };
    const onFocus = (e: FocusEvent) => {
      const el = pick(e.target);
      if (!el) return;
      setHovered(el);
      announceSpec(el, '');
    };
    const onTheme = () => {
      tokens.current = resolveTokens();
      redraw();
    };
    const theme = new MutationObserver(onTheme);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerdown', swallow, true);
    window.addEventListener('pointerup', swallow, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('focusin', onFocus, true);
    window.addEventListener('scroll', redraw, { passive: true, capture: true });
    window.addEventListener('resize', redraw);
    document.documentElement.setAttribute('data-inspecting', '');
    return () => {
      cancelAnimationFrame(raf);
      theme.disconnect();
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerdown', swallow, true);
      window.removeEventListener('pointerup', swallow, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('focusin', onFocus, true);
      window.removeEventListener('scroll', redraw, true);
      window.removeEventListener('resize', redraw);
      document.documentElement.removeAttribute('data-inspecting');
    };
  }, [announceSpec, onExit, pin]);

  const focus = hovered ?? pinned;
  const focusRect = focus?.isConnected ? focus.getBoundingClientRect() : null;
  const pinRect = pinned?.isConnected ? pinned.getBoundingClientRect() : null;
  const spec = focus?.isConnected ? readSpec(focus, tokens.current) : null;
  const segments = pinRect && focusRect && hovered && hovered !== pinned ? measure(pinRect, focusRect) : [];

  let cardStyle: CSSProperties | undefined;
  if (focusRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(8, focusRect.left), vw - CARD_W - 8);
    const below = focusRect.bottom + 28;
    const room = vh - below;
    cardStyle = room > 200 ? { left, top: below } : { left, bottom: Math.max(8, vh - focusRect.top + 28) };
  }

  const box = (r: DOMRect, className: string) => (
    <div className={className} style={{ left: r.left, top: r.top, width: r.width, height: r.height }} />
  );

  return createPortal(
    <div data-inspector className="inspector">
      {pinRect && box(pinRect, 'inspector-box inspector-pinned')}
      {focusRect && focus !== pinned && box(focusRect, 'inspector-box')}
      {focusRect && spec && (
        <span className="inspector-chip" style={{ left: focusRect.left, top: focusRect.bottom + 4 }}>
          {spec.size}
        </span>
      )}

      {segments.map((s, i) => {
        const vertical = s.x1 === s.x2;
        return (
          <div key={i}>
            <div
              className="inspector-line"
              style={
                vertical
                  ? { left: s.x1, top: s.y1, width: 1, height: s.y2 - s.y1 }
                  : { left: s.x1, top: s.y1, width: s.x2 - s.x1, height: 1 }
              }
            />
            <span
              className="inspector-chip inspector-chip-centre"
              style={{ left: (s.x1 + s.x2) / 2, top: (s.y1 + s.y2) / 2 }}
            >
              {Math.round(s.label * 10) / 10}
            </span>
          </div>
        );
      })}

      {spec && cardStyle && (
        <div className="inspector-card" style={cardStyle} aria-hidden="true">
          <p className="inspector-card-head">
            <span>{spec.name}</span>
            <span>{spec.size}</span>
          </p>
          <dl>
            {spec.rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {pinned && focus !== pinned && <p className="inspector-hint">Red lines measure from the pinned element.</p>}
        </div>
      )}

      {/* Screen readers hear a spec when something is pinned or focused, never on every mouse move */}
      <p className="sr-only" role="status" aria-live="polite">
        {said}
      </p>

      <button type="button" className="inspector-stop" onClick={onExit}>
        Stop inspecting
      </button>
    </div>,
    document.body,
  );
}
