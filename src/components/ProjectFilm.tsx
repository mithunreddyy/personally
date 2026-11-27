import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { Project } from '../types';
import { announce } from './Island';
import { useOnline } from '../hooks/useOnline';
import { OfflineWalker } from './OfflineWalker';
import { StrideFigure } from './StrideFigure';

const VIDEO = /\.(mp4|webm|mov)$/i;
// The walker's box and stride, as on the reading path: one step is 19.9 units of the 40/62-scale figure, and a
// full stride (two steps) is 1.1s of the CSS walk cycle, so this many pixels of travel play exactly one step
const WALKER = 21;
const STEP_PX = 19.9 * (40 / 62);
const CYCLE_MS = 1100;

const clock = (s: number) => {
  const whole = Math.max(0, Math.floor(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * A project's film: the recording at the column's widest, and under it the hero's path as the seek bar.
 * The walker stands at the playhead and his stride is driven by playback, so his feet stay planted at any
 * speed; posts on the path mark where each scene starts. It plays muted once it is mostly on screen, and
 * stops when it leaves (unless the sound is on). A screenshot instead of a recording is shown as before
 */
export function ProjectFilm({ project }: { project: Project }) {
  const base = import.meta.env.BASE_URL;
  const src = `${base}${project.media}`;
  const [width, height] = (project.mediaSize ?? '').split(/\s*x\s*/i).map(Number);
  const size = width > 0 && height > 0 ? { width, height } : {};
  const alt = project.mediaAlt ?? `${project.title} in use`;

  if (!VIDEO.test(project.media ?? '')) {
    return (
      <figure className="project-media">
        <img src={src} alt={alt} loading="lazy" decoding="async" {...size} />
      </figure>
    );
  }
  return <Film project={project} src={src} alt={alt} size={size} />;
}

function Film({
  project,
  src,
  alt,
  size,
}: {
  project: Project;
  src: string;
  alt: string;
  size: { width?: number; height?: number };
}) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const walker = useRef<HTMLDivElement>(null);
  const chosePause = useRef(false);
  const scrubbing = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const online = useOnline();

  const scenes = project.scenes;
  const sceneIndex = scenes.reduce((found, scene, i) => (time + 0.05 >= scene.at ? i : found), -1);
  const scene = sceneIndex >= 0 ? scenes[sceneIndex] : undefined;

  // Places the walker at the playhead. Travel plays his stride; scrubbing back turns him round
  const lastX = useRef<number | null>(null);
  const travelled = useRef(0);
  const place = useCallback(() => {
    const v = video.current;
    const box = track.current;
    const figure = walker.current;
    if (!v || !box || !figure) return;
    const length = v.duration || 0;
    const room = box.clientWidth - WALKER;
    const x = length ? (v.currentTime / length) * room : 0;
    box.style.setProperty('--room', `${room}px`);
    figure.style.transform = `translateX(${x.toFixed(1)}px)`;

    const last = lastX.current;
    if (last !== null && x !== last) {
      const back = scrubbing.current && x < last;
      figure.classList.toggle('film-walker-back', back);
      // A loop back to the start is a jump, not a walk
      if (Math.abs(x - last) < room / 2) travelled.current += Math.abs(x - last);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const at = (travelled.current / (STEP_PX * 2)) * CYCLE_MS;
        figure.getAnimations({ subtree: true }).forEach(animation => (animation.currentTime = at));
      }
    }
    lastX.current = x;
  }, []);

  // While playing, follow every frame; when paused, place him on each seek and resize
  useEffect(() => {
    if (!playing) {
      place();
      return;
    }
    let frame = requestAnimationFrame(function follow() {
      place();
      frame = requestAnimationFrame(follow);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, place]);

  // The prerendered video can load its metadata before React attaches its handlers, so read it once here
  useEffect(() => {
    const v = video.current;
    if (v?.error) setStatus('error');
    else if (v && v.readyState >= 1) {
      setDuration(v.duration);
      place();
    }
  }, [place]);

  // The film downloads nothing until it is about a screen away: the page ships with preload="none"
  const wake = useCallback(() => {
    const v = video.current;
    if (!v || v.preload !== 'none') return;
    v.preload = 'metadata';
    v.load();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && wake(), { rootMargin: '600px 0px' });
    observer.observe(v);
    return () => observer.disconnect();
  }, [wake]);

  // A scene link (/work/sieve?t=21) opens the film at that moment. Read after mount, never during render,
  // so the prerendered page and the first client render agree
  const [params] = useSearchParams();
  const at = params.get('t');
  const pending = useRef<number | null>(null);
  const startAt = useCallback(
    (seconds: number) => {
      const v = video.current;
      if (!v) return;
      v.currentTime = Math.min(seconds, Math.max(v.duration - 0.05, 0));
      setTime(v.currentTime);
      place();
      v.closest('figure')?.scrollIntoView({ block: 'center' });
      chosePause.current = false;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        v.play().catch(() => {
          // Autoplay refused: the film waits at the scene, and Play is right there
        });
      }
    },
    [place],
  );

  useEffect(() => {
    if (at === null) return;
    const seconds = at.includes(':') ? at.split(':').reduce((t, part) => t * 60 + Number(part), 0) : Number(at);
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const v = video.current;
    if (v && v.readyState >= 1) startAt(seconds);
    else {
      pending.current = seconds;
      wake();
    }
  }, [at, startAt, wake]);

  const [copied, setCopied] = useState<'idle' | 'failed'>('idle');
  const copyLink = () => {
    const seconds = Math.floor(time);
    const url = new URL(`work/${project.id}?t=${seconds}`, `${window.location.origin}${import.meta.env.BASE_URL}`).href;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied('idle');
        announce(`Link copied, starts at ${clock(seconds)}`);
      })
      .catch(() => setCopied('failed'));
  };

  // React doesn't keep the muted property in step with the prop, so set it directly
  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [place]);

  // Plays muted once most of it is on screen, unless the reader paused it or asked for less motion
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!still && !chosePause.current && v.paused) {
            v.play().catch(() => {
              // Autoplay refused (data saver, low power): Play is right there
            });
          }
        } else if (!v.paused && v.muted) {
          v.pause();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(v);
    return () => observer.disconnect();
  }, []);

  const seek = (to: number) => {
    const v = video.current;
    if (!v || !v.duration) return;
    v.currentTime = Math.min(Math.max(to, 0), v.duration - 0.05);
    setTime(v.currentTime);
    place();
  };

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      chosePause.current = false;
      v.play().catch(() => setStatus('error'));
    } else {
      chosePause.current = true;
      v.pause();
    }
  };

  const playScene = (at: number) => {
    seek(at);
    chosePause.current = false;
    video.current?.play().catch(() => setStatus('error'));
  };

  const retry = () => {
    setStatus('loading');
    video.current?.load();
  };

  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = track.current;
    const v = video.current;
    if (!box || !v?.duration) return;
    const rect = box.getBoundingClientRect();
    const fraction = (event.clientX - rect.left - WALKER / 2) / (rect.width - WALKER);
    seek(Math.min(Math.max(fraction, 0), 1) * v.duration);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 10, PageDown: -10 }[event.key];
    if (step !== undefined) seek(time + step);
    else if (event.key === 'Home') seek(0);
    else if (event.key === 'End') seek(video.current?.duration ?? 0);
    else if (event.key === ' ' || event.key === 'Enter') toggle();
    else return;
    event.preventDefault();
  };

  const poster = project.poster ? `${import.meta.env.BASE_URL}${project.poster}` : undefined;

  return (
    <>
      <figure className="film" aria-label={`${project.title} film`}>
        <div className="film-screen">
          {/* Clicking the picture plays or pauses it; keyboard users have the Play button and the path */}
          <video
            ref={video}
            src={src}
            poster={poster}
            muted={muted}
            loop
            playsInline
            preload="none"
            aria-label={alt}
            onClick={toggle}
            onDurationChange={event => setDuration(event.currentTarget.duration || 0)}
            onLoadedMetadata={event => {
              setDuration(event.currentTarget.duration);
              setStatus('ready');
              place();
              if (pending.current !== null) {
                startAt(pending.current);
                pending.current = null;
              }
            }}
            onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onWaiting={() => setStatus('loading')}
            onPlaying={() => setStatus('ready')}
            onError={() => setStatus('error')}
            {...size}
          />
          {/* Films stream from the network and are never saved for offline use, so without a connection the
              film says so plainly, with the walker looking for a signal; it clears itself when the connection
              returns. Everything else on the page was saved and still works */}
          {!online && (duration === 0 || status === 'error') && (
            <div className="film-error film-offline" role="status">
              <OfflineWalker />
              <p>Films need a connection. The rest of the site works offline.</p>
            </div>
          )}
          {online && status === 'error' && (
            <div className="film-error" role="alert">
              <p>The film didn't load.</p>
              <button type="button" className="film-word" onClick={retry}>
                <span className="link-line">Try again</span>
              </button>
            </div>
          )}
        </div>

        <div className="film-bar">
          <div
            ref={track}
            className="film-path"
            role="slider"
            tabIndex={0}
            aria-label="Film position"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={`${clock(time)} of ${clock(duration)}${scene ? `, ${scene.title}` : ''}`}
            onKeyDown={onKey}
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId);
              scrubbing.current = true;
              seekFromPointer(event);
            }}
            onPointerMove={event => {
              if (scrubbing.current) seekFromPointer(event);
            }}
            onPointerUp={() => {
              scrubbing.current = false;
              walker.current?.classList.remove('film-walker-back');
            }}
            onPointerCancel={() => (scrubbing.current = false)}
          >
            <span className="film-path-line" aria-hidden="true" />
            <div ref={walker} className="film-walker" aria-hidden="true">
              <StrideFigure width={WALKER} />
            </div>
          </div>

          <div className="film-controls">
            <button type="button" className="film-word" onClick={toggle} aria-label={playing ? 'Pause film' : 'Play film'}>
              <span className="link-line">{playing ? 'Pause' : 'Play'}</span>
            </button>
            <span className="text-muted tabular-nums" aria-hidden="true">
              {status === 'loading' ? 'Loading' : `${clock(time)} / ${duration ? clock(duration) : '-:--'}`}
            </span>
            <button type="button" className="film-word film-word-end" onClick={copyLink}>
              <span className="link-line">{copied === 'failed' ? 'Copy failed' : 'Copy link'}</span>
            </button>
            <button
              type="button"
              className="film-word"
              aria-pressed={!muted}
              onClick={() => setMuted(m => !m)}
            >
              <span className="link-line">{muted ? 'Sound off' : 'Sound on'}</span>
            </button>
          </div>
        </div>
      </figure>

      {scenes.length > 0 && (
        <ol className="film-scenes" aria-label="Scenes">
          {scenes.map((s, i) => (
            <li key={s.at}>
              <button
                type="button"
                className="film-scene"
                aria-current={i === sceneIndex && (playing || time > 0) ? 'true' : undefined}
                onClick={() => playScene(s.at)}
              >
                <span className="film-scene-time tabular-nums">{clock(s.at)}</span>
                <span className="film-scene-title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
