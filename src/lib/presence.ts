import { useEffect, useState } from 'react';

const MAX_BACKOFF_MS = 30_000;
// A small ping keeps this page counted; the worker lets go of pages that stop sending it
const PING_MS = 25_000;

/**
 * How many other people have the home page open right now. One WebSocket to the worker's Presence object,
 * open only while this tab is visible; it reconnects with a growing pause, and with no worker at all
 * (local dev, the GitHub Pages backup) it quietly stays at zero
 */
export function usePresence(enabled: boolean): number {
  const [others, setOthers] = useState(0);

  useEffect(() => {
    if (!enabled || typeof WebSocket === 'undefined') return;
    let socket: WebSocket | null = null;
    let retry = 0;
    let timer = 0;
    const ping = window.setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send('ping'), PING_MS);
    let stopped = false;

    const connect = () => {
      if (stopped || document.hidden || socket) return;
      const url = new URL(`${import.meta.env.BASE_URL}api/presence`, window.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url);
      socket = ws;
      ws.onopen = () => {
        retry = 0;
      };
      ws.onmessage = event => {
        try {
          if (event.data === 'pong') return;
          const here = Number(JSON.parse(String(event.data)).here);
          if (Number.isFinite(here)) setOthers(Math.max(0, here - 1));
        } catch {
          // Not ours to read; ignore it
        }
      };
      ws.onclose = () => {
        if (socket === ws) socket = null;
        setOthers(0);
        if (stopped || document.hidden) return;
        // 1s, 2s, 4s… up to 30s between tries
        const wait = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retry);
        retry += 1;
        timer = window.setTimeout(connect, wait);
      };
    };

    // A hidden tab lets go of its place, so the count is people actually looking
    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
        socket?.close();
        socket = null;
        setOthers(0);
      } else connect();
    };

    connect();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.clearInterval(ping);
      document.removeEventListener('visibilitychange', onVisibility);
      socket?.close();
    };
  }, [enabled]);

  return others;
}
