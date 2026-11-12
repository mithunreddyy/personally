import { useEffect, useRef } from 'react';

import { Project } from '../types';

const VIDEO = /\.(mp4|webm|mov)$/i;

/**
 * A project's screenshot or screen recording, shown above its details. A recording plays muted on a
 * loop like a looping image, with controls so it can be paused; under reduced motion it waits for a play
 */
export function ProjectMedia({ project }: { project: Project }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = `${import.meta.env.BASE_URL}${project.media}`;
  const [width, height] = (project.mediaSize ?? '').split(/\s*x\s*/i).map(Number);
  const size = width > 0 && height > 0 ? { width, height } : {};
  const alt = project.mediaAlt ?? `${project.title} in use`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    video.play().catch(() => {
      // Autoplay refused (data saver, low power): the controls are there to start it
    });
  }, []);

  return (
    <figure className="project-media">
      {VIDEO.test(project.media ?? '') ? (
        <video ref={videoRef} src={src} muted loop playsInline controls preload="metadata" aria-label={alt} {...size} />
      ) : (
        <img src={src} alt={alt} loading="lazy" decoding="async" {...size} />
      )}
    </figure>
  );
}
