import { useEffect, useRef } from 'react';

// Reading progress on blog posts, told with the hero's walker. Scrolling moves him and also drives his stride,
// so his feet stay planted at any speed; at the end he turns round and sits on the bench with a book
const EDGE = 0.6; // progress is measured where the reader's eye is, 60% down the screen
const WALKER = 21;
const PARK = 64;
const MARKERS = [0.25, 0.5, 0.75];
// The figure is the hero's at 40/62 scale. One step there is 19.9 units, and a full stride (two steps) is
// 1.1s of the CSS walk cycle, so this many pixels of travel play exactly one step
const SCALE = 40 / 62;
const STEP_PX = 19.9 * SCALE;
const CYCLE_MS = 1100;
// At the moment a heel lands, that foot is 9.9 units ahead of his hips: where a footprint goes
const FOOT_AHEAD = 9.93 * SCALE;
const MAX_PRINTS = 14;

export function ReadingPath() {
  const root = useRef<HTMLDivElement>(null);
  const walker = useRef<HTMLDivElement>(null);
  const prints = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = document.querySelector<HTMLElement>('[data-reading]');
    const bar = root.current;
    const figure = walker.current;
    const trail = prints.current;
    const track = bar?.querySelector<HTMLElement>('.reading-path-track');
    if (!body || !bar || !figure || !trail || !track) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    let lastX: number | null = null;
    let travelled = 0;
    let step = 0;

    const progressNow = () => {
      const box = body.getBoundingClientRect();
      const top = box.top + window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const start = top - window.innerHeight * EDGE;
      // The end is where the article's last line reaches the eye line, or the bottom of the page if the
      // page can't scroll that far (a tall window, a short post)
      const end = Math.min(top + box.height - window.innerHeight * EDGE, max);
      if (end <= start) return window.scrollY >= end ? 1 : 0;
      return Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
    };

    const leavePrint = (x: number, facing: number) => {
      const print = document.createElement('span');
      print.className = 'reading-print';
      print.style.left = `${(x + WALKER / 2 + facing * FOOT_AHEAD - 1.5).toFixed(1)}px`;
      print.addEventListener('animationend', () => print.remove());
      trail.append(print);
      while (trail.childElementCount > MAX_PRINTS) trail.firstElementChild?.remove();
    };

    const update = () => {
      frame = 0;
      const progress = progressNow();
      const room = track.clientWidth - WALKER - PARK;
      const x = progress * room;
      figure.style.transform = `translateX(${x.toFixed(1)}px)`;
      bar.style.setProperty('--room', `${room}px`);
      bar.toggleAttribute('data-on', window.scrollY > 160);
      bar.toggleAttribute('data-done', progress >= 0.999);

      if (lastX !== null && x !== lastX) {
        const facing = x > lastX ? 1 : -1;
        figure.classList.toggle('reading-walker-back', facing < 0);
        travelled += Math.abs(x - lastX);
        // The scroll is the clock: every pixel he travels plays exactly that much of his stride
        if (!still) {
          const time = (travelled / (STEP_PX * 2)) * CYCLE_MS;
          figure.getAnimations({ subtree: true }).forEach(animation => (animation.currentTime = time));
          const nextStep = Math.floor(travelled / STEP_PX);
          if (nextStep !== step) {
            step = nextStep;
            leavePrint(x, facing);
          }
        }
      }
      lastX = x;
    };

    const onChange = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onChange, { passive: true });
    window.addEventListener('resize', onChange);
    return () => {
      window.removeEventListener('scroll', onChange);
      window.removeEventListener('resize', onChange);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={root} className="reading-path print:hidden" aria-hidden="true">
      <div className="reading-path-track">
        <span className="reading-path-line" />
        <span className="reading-path-dashes" />
        <div ref={prints} className="reading-prints" />
        {/* Quarter markers, like distance posts along the way */}
        {MARKERS.map(at => (
          <span key={at} className="reading-path-marker" style={{ left: `calc(${WALKER / 2}px + var(--room, 0px) * ${at})` }} />
        ))}

        {/* The hero's figure at a smaller size, with the same limbs and stride */}
        <div ref={walker} className="reading-walker">
          <svg viewBox="44 4 32 62" width={WALKER} height="40" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <g className="walker-figure" strokeWidth="2.2">
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
                </g>
              </g>
            </g>
          </svg>
        </div>

        {/* The path ends at a park bench under a street lamp, which lights when he arrives. He sits facing
            back along the path, legs crossed, reading, one foot swinging */}
        <svg className="reading-park" viewBox="0 0 64 44" width={PARK} height="44" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g className="reading-lamp-light" strokeWidth="0.9" strokeDasharray="1.2 2.6">
            <path d="M45.4 11 L37 41 M47.4 11.4 L47.4 41 M49.4 11 L58 41" />
          </g>
          <g className="reading-park-iron" strokeWidth="1.2">
            <path d="M54 43 V7.5 Q54 3 49.5 3 H47.5" />
            <path d="M51.5 43 H56.5" />
            <path d="M44.6 3.6 H50.2 L49.2 8 H45.6 Z" />
            <path d="M15 30.4 H43 M16 33 H42" />
            <path d="M17.5 33 L16 43 M40.5 33 L42.5 43" />
            <path d="M40.5 30.4 L44.5 14.5 M42.4 22.4 L44 17" />
            <path d="M15 30.4 Q11 30 11.6 26.6 Q12.4 23.6 15.4 25.4" />
          </g>
          <circle className="reading-lamp-bulb" cx="47.4" cy="8.6" r="1.4" />
          <g className="reading-seated" strokeWidth="1.4">
            <circle cx="32.5" cy="9.4" r="3.4" />
            <path d="M33.4 12.8 L35.6 29.6" />
            <path d="M35.6 29.6 L26.4 28.8 L25.2 43" />
            <path d="M35.6 29.6 L27.4 26.6" />
            <g className="reading-foot">
              <path d="M27.4 26.6 L21.8 32.8" />
            </g>
            <path d="M34 15.6 L29.4 21.6 L26.2 17.2" />
            <path d="M21.6 14.2 L25.4 18.2 L29 14" strokeWidth="1.2" />
          </g>
        </svg>
      </div>
    </div>
  );
}
