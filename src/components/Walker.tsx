import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { usePresence } from '../lib/presence';
import { useHyderabadWeather, weatherGreeting } from '../lib/weather';
import { announce } from './Island';

// A stick figure that keeps walking along a path at the top of the intro. It walks in place while the
// ground slides under it at stride speed (see .walker in index.css), so the planted foot never skids
const TUFTS = [18, 84, 141, 218, 284, 341];
// Stars across the sky band above him, kept clear of his head; [x, y, radius]
const STARS: [number, number, number][] = [
  [14, -9, 0.9], [34, 2, 0.6], [86, -13, 1.1], [104, 3, 0.7], [128, -6, 0.9],
  [150, 8, 0.6], [168, -14, 1], [186, -2, 0.7], [196, 14, 0.6],
];

// How long he stops to wave before walking on, and how long without input before he sits down to rest
const WAVE_MS = 2400;
const IDLE_MS = 40_000;
const POSE_MS = 520;

// The sky follows the clock in Hyderabad, like the greeting under it: the sun is up from 6:00 to 18:30
const ZONE = 'Asia/Kolkata';
const SUNRISE = 6 * 60;
const SUNSET = 18 * 60 + 30;
const GROUND = 64.5;
// His head's centre, and how far the sun or moon (rays included) keeps from it
const HEAD = [60, 13.5];
const HEAD_CLEAR = 18;

function minutesInHyderabad(date: Date) {
  const [h, m] = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONE }).split(':');
  return Number(h) * 60 + Number(m);
}

/** Where the sun or moon sits: an arc rising ahead of him on the right and setting behind him on the left */
function sky(minutes: number) {
  const day = minutes >= SUNRISE && minutes < SUNSET;
  const span = day ? SUNSET - SUNRISE : 24 * 60 - (SUNSET - SUNRISE);
  const t = ((minutes - (day ? SUNRISE : SUNSET) + 24 * 60) % (24 * 60)) / span;
  // Flattened at the top, so the arc is still high where it crosses over him in the afternoon
  const height = Math.pow(Math.sin(Math.PI * t), 0.7);
  const x = 186 - t * 176;
  // Rise and set inside the sky band above the path (30 at the horizon, -9 at the top, so the rays clear
  // the edge), never on the path and never on him: within HEAD_CLEAR of his head it rides over it instead
  const dx = Math.abs(x - HEAD[0]);
  const over = dx < HEAD_CLEAR ? HEAD[1] - Math.sqrt(HEAD_CLEAR ** 2 - dx ** 2) : Infinity;
  const y = Math.min(30 - height * 39, over);
  // The shadow falls away from the sun, long near the horizon and short at noon
  const shadow = day ? Math.round((x > 60 ? -1 : 1) * (5 + (1 - height) * 30) * 10) / 10 : 0;
  return { day, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, shadow };
}

// Rain falls across the sky band at these x positions; drizzle uses every other one
const DROPS = [8, 24, 41, 57, 73, 89, 106, 122, 139, 155, 171, 188];
// Other people on the page walk behind him, faint and dashed, at most this many
const MAX_GHOSTS = 4;
const GHOST_X = [-26, -48, -70, -92];

/**
 * The stick figure itself, shared by the walker and the faint walkers of other visitors: head, body, and
 * the four limbs in the order that draws the far side behind the near side
 */
function Figure({ lantern, extras, className = '' }: { lantern?: ReactNode; extras?: ReactNode; className?: string }) {
  return (
    <g className={`walker-figure ${className}`} strokeWidth="2">
      <circle cx="60" cy="13.5" r="5.5" />
      <path d="M60 19 L60 40" />
      <g className="walker-limb walker-arm-b">
        <path d="M60 24 L60 33" />
        <g className="walker-forearm">
          <path d="M60 33 L60 41" />
        </g>
      </g>
      <g className="walker-limb walker-leg-b">
        <path d="M60 40 L60 52" />
        <g className="walker-shin">
          <path d="M60 52 L60 63.5" />
        </g>
      </g>
      <g className="walker-limb walker-leg-a">
        <path d="M60 40 L60 52" />
        <g className="walker-shin">
          <path d="M60 52 L60 63.5" />
        </g>
      </g>
      <g className="walker-limb walker-arm-a">
        <path d="M60 24 L60 33" />
        <g className="walker-forearm">
          <path d="M60 33 L60 41" />
          {lantern}
        </g>
      </g>
      {extras}
    </g>
  );
}

// Parts that change pose when he sits down or stands up
const POSED = '.walker-figure, .walker-limb, .walker-forearm, .walker-shin';

export function Walker({ className = '' }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [waving, setWaving] = useState(false);
  const [resting, setResting] = useState(false);
  const [standing, setStanding] = useState(false);
  const [paused, setPaused] = useState(false);
  // Null until mounted, so the prerendered page carries no build-time sky
  const [minutes, setMinutes] = useState<number | null>(null);
  // Hyderabad's real weather and how many others are on the page; both stay empty without the worker
  const weather = useHyderabadWeather();
  const others = usePresence(true);
  // Slots for other visitors only grow, so someone leaving fades out instead of vanishing
  const [ghostSlots, setGhostSlots] = useState(0);
  useEffect(() => setGhostSlots(n => Math.max(n, Math.min(MAX_GHOSTS, others))), [others]);

  useEffect(() => {
    setMinutes(minutesInHyderabad(new Date()));
    const timer = window.setInterval(() => setMinutes(minutesInHyderabad(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!waving) return;
    const timer = window.setTimeout(() => setWaving(false), WAVE_MS);
    return () => window.clearTimeout(timer);
  }, [waving]);

  // Moves every posed part from where it is now to where the new class puts it, so sitting down and
  // standing up start from whatever step he was on instead of snapping
  const morph = useCallback((change: () => void, done?: () => void) => {
    const svg = ref.current;
    if (!svg) return change();
    const parts = [...svg.querySelectorAll<SVGElement>(POSED)];
    const from = parts.map(part => getComputedStyle(part).transform);
    change();
    const to = parts.map(part => getComputedStyle(part).transform);
    const runs = parts.map((part, i) =>
      part.animate([{ transform: from[i] }, { transform: to[i] }], { duration: POSE_MS, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' }),
    );
    if (done) Promise.all(runs.map(run => run.finished)).then(done, done);
  }, []);

  const sitDown = useCallback(() => {
    morph(() => {
      ref.current?.classList.add('walker-resting');
      setResting(true);
    });
  }, [morph]);

  // He stands into the first frame of his walk, held paused, then the walk carries on from there
  const standUp = useCallback(() => {
    const svg = ref.current;
    if (!svg) return;
    morph(
      () => {
        svg.classList.remove('walker-resting');
        svg.classList.add('walker-standing');
        setResting(false);
        setStanding(true);
      },
      () => {
        svg.classList.remove('walker-standing');
        setStanding(false);
      },
    );
  }, [morph]);

  // After 40 seconds without input he sits down on a stone; any key, scroll or tap gets him walking again
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = window.setTimeout(sitDown, IDLE_MS);
    const wake = () => {
      window.clearTimeout(timer);
      if (ref.current?.classList.contains('walker-resting')) standUp();
      timer = window.setTimeout(sitDown, IDLE_MS);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const;
    events.forEach(event => window.addEventListener(event, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, wake));
    };
  }, [sitDown, standUp]);

  const wave = () => {
    if (waving) return;
    announce(weather ? weatherGreeting(weather) : 'Hi, thanks for stopping by', 'hello');
    // Tapping a resting walker wakes him first; he waves once he is back on his feet
    if (resting) window.setTimeout(() => setWaving(true), POSE_MS);
    else setWaving(true);
  };

  // Off screen the walk pauses, so a long read further down the page costs no animation work
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const now = minutes === null ? null : sky(minutes);
  const kind = weather?.kind;
  // Under rain, storm or fog the sun, moon and stars are hidden and he casts no shadow
  const overcast = kind === 'rain' || kind === 'storm' || kind === 'fog';
  const wet = kind === 'rain' || kind === 'drizzle' || kind === 'storm';
  const cloudy = kind === 'clouds' || kind === 'drizzle' || wet;
  const hot = !!weather && !!now?.day && weather.temp >= 35 && !wet;
  const windy = !!weather && weather.wind >= 25;
  const label = `Wave at the walker${others > 0 ? `. ${others} other ${others === 1 ? 'person is' : 'people are'} here now` : ''}`;

  return (
    // Tap him and he stops mid-stride to wave; the status pill says hi for anyone who can't see it
    <button type="button" onClick={wave} aria-label={label} className={`walker-button ${className}`}>
      <svg
        ref={ref}
        aria-hidden="true"
        viewBox="0 -18 200 90"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-sky={now ? (now.day ? 'day' : 'night') : undefined}
        // Classes are also set directly during a pose change (see morph), and mirrored here so a re-render keeps them
        className={[
          'walker',
          wet && 'walker-wet',
          windy && 'walker-windy',
          waving && 'walker-waving',
          resting && 'walker-resting',
          standing && 'walker-standing',
          paused && 'walker-paused',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <defs>
          {/* The path fades in on the left and out on the right, so it reads as going somewhere */}
          <linearGradient id="walker-fade">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.14" stopColor="#fff" />
            <stop offset="0.8" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="walker-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="72">
            <rect width="200" height="72" fill="url(#walker-fade)" />
          </mask>
        </defs>

        {now && !overcast && (
          <g className="walker-sky">
            {now.day ? (
              <g className="walker-sun" strokeWidth="1.3">
                <circle cx={now.x} cy={now.y} r="4" />
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i * Math.PI) / 4;
                  return (
                    <path
                      key={i}
                      d={`M${(now.x + Math.cos(a) * 6.5).toFixed(2)} ${(now.y + Math.sin(a) * 6.5).toFixed(2)} L${(now.x + Math.cos(a) * 8.6).toFixed(2)} ${(now.y + Math.sin(a) * 8.6).toFixed(2)}`}
                    />
                  );
                })}
              </g>
            ) : (
              <>
                {STARS.map(([x, y, r], i) => (
                  <circle key={x} cx={x} cy={y} r={r} className={`walker-star${i % 3 === 0 ? ' walker-star-twinkle' : ''}`} style={{ animationDelay: `${-i * 0.7}s` }} />
                ))}
                <path
                  className="walker-moon"
                  d={`M${now.x} ${now.y - 4.6} A4.6 4.6 0 1 0 ${now.x} ${now.y + 4.6} A6 6 0 0 1 ${now.x} ${now.y - 4.6} Z`}
                />
              </>
            )}
          </g>
        )}

        {/* Weather over the sky band: drifting clouds, falling rain, low fog, and in a storm a faint flash */}
        {cloudy && (
          <g className="walker-clouds" strokeWidth="1">
            <path className="walker-cloud" d="M118 4 h20 a4.5 4.5 0 0 0 -3 -8.5 a6.5 6.5 0 0 0 -12 -1.5 a4.5 4.5 0 0 0 -5 10 Z" />
            <path className="walker-cloud walker-cloud-slow" d="M150 -6 h16 a3.8 3.8 0 0 0 -2.5 -7 a5.5 5.5 0 0 0 -10 -1.2 a3.8 3.8 0 0 0 -3.5 8.2 Z" />
          </g>
        )}
        {kind === 'storm' && <rect className="walker-flash" x="0" y="-18" width="200" height="82" />}
        {wet && (
          <g className="walker-rain" strokeWidth="1">
            {(kind === 'drizzle' ? DROPS.filter((_, i) => i % 2 === 0) : DROPS).map((x, i) => (
              <path
                key={x}
                className={`walker-drop${kind === 'drizzle' ? ' walker-drop-slow' : ''}`}
                d={`M${x} -16 l-1.2 3.4`}
                style={{ animationDelay: `${-((i * 0.37) % 1)}s` }}
              />
            ))}
          </g>
        )}
        {kind === 'fog' && (
          <g className="walker-fog" strokeWidth="1">
            <line x1="0" y1="48" x2="200" y2="48" />
            <line x1="0" y1="54" x2="200" y2="54" />
            <line x1="0" y1="59.5" x2="200" y2="59.5" />
          </g>
        )}

        <g mask="url(#walker-mask)" className="walker-ground">
          <line x1="0" y1={GROUND} x2="200" y2={GROUND} strokeWidth="1" />
          <line className="walker-track" x1="-40" y1="69" x2="240" y2="69" strokeWidth="1" strokeDasharray="5 14.9" />
          <g className="walker-tufts" strokeWidth="1">
            {TUFTS.map(x => (
              <path key={x} d={`M${x} 64 l-1.6 -3.6 M${x + 2} 64 l0.4 -4.6 M${x + 4} 64 l2 -3.2`} />
            ))}
          </g>
        </g>

        {now?.shadow && !overcast ? (
          <line className="walker-shadow" x1="60" y1={GROUND} x2={60 + now.shadow} y2={GROUND} strokeWidth="2.6" />
        ) : null}

        {/* The stone he sits on when he rests */}
        <path className="walker-stone" d="M49 64.5 Q51 58 59.5 58 Q68 58 70 64.5" strokeWidth="1" />

        {/* Other people on the page right now: faint dashed walkers behind him, each a step out of time */}
        {Array.from({ length: ghostSlots }, (_, i) => (
          <svg
            key={i}
            x={GHOST_X[i]}
            y="-18"
            width="200"
            height="90"
            viewBox="0 -18 200 90"
            overflow="visible"
            className="walker-ghost"
            data-on={i < others || undefined}
            style={{ ['--lag' as string]: `${-0.17 * (i + 1)}s` }}
          >
            <Figure />
          </svg>
        ))}

        <Figure
          lantern={
            // After dark he carries a lantern, which swings with his hand
            now &&
            !now.day && (
              <g className="walker-lantern" strokeWidth="1.2">
                <path d="M60 41 L60 43.4" />
                <rect x="58.1" y="43.4" width="3.8" height="4.6" rx="0.9" />
                <circle cx="60" cy="45.7" r="0.9" className="walker-flame" />
              </g>
            )
          }
          extras={
            <>
              {/* In the rain he holds an umbrella up in his far hand, so the near one is free to wave */}
              {wet && (
                <g className="walker-umbrella" strokeWidth="1.3">
                  <path d="M64.4 7.6 L64.4 -5" />
                  {/* Dome with a scalloped hem, and a centre rib */}
                  <path
                    className="walker-canopy"
                    d="M52.4 -5 A12 12 0 0 1 76.4 -5 q-3 -2.4 -6 0 q-3 -2.4 -6 0 q-3 -2.4 -6 0 q-3 -2.4 -6 0 Z"
                  />
                  <path d="M64.4 -17 L64.4 -7.4" strokeWidth="0.8" />
                </g>
              )}
              {/* On a hot day, a cap */}
              {hot && <path className="walker-cap" d="M54.5 11.3 A5.5 5.5 0 0 1 65.5 11.3 Z M65.5 11.3 L69.4 11.3" strokeWidth="1.3" />}
            </>
          }
        />
      </svg>
    </button>
  );
}
