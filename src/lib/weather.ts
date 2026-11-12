import { useEffect, useState } from 'react';

export type WeatherKind = 'clear' | 'clouds' | 'fog' | 'drizzle' | 'rain' | 'storm';

export interface Weather {
  kind: WeatherKind;
  /** °C */
  temp: number;
  /** km/h */
  wind: number;
}

const KINDS: WeatherKind[] = ['clear', 'clouds', 'fog', 'drizzle', 'rain', 'storm'];
const REFRESH_MS = 30 * 60 * 1000;

/**
 * The current weather in Hyderabad, from the worker. Null until it arrives, and it stays null when there
 * is no worker (local dev, the GitHub Pages backup) or the upstream is down: the walker goes without
 * rather than guess
 */
// One request shared by everything on the page (the walker and the footer credit), refreshed half-hourly
let shared: { at: number; promise: Promise<Weather | null> } | null = null;

function loadWeather(): Promise<Weather | null> {
  if (shared && Date.now() - shared.at < REFRESH_MS) return shared.promise;
  const promise = fetch(`${import.meta.env.BASE_URL}api/weather`)
    .then(res => (res.ok ? res.json() : null))
    .then((data: Partial<Weather> | null) =>
      data && KINDS.includes(data.kind as WeatherKind) && typeof data.temp === 'number' && typeof data.wind === 'number'
        ? { kind: data.kind as WeatherKind, temp: data.temp, wind: data.wind }
        : null,
    )
    .catch(() => null);
  shared = { at: Date.now(), promise };
  return promise;
}

/**
 * The current weather in Hyderabad, from the worker. Null until it arrives, and it stays null when there
 * is no worker (local dev, the GitHub Pages backup) or the upstream is down: the walker goes without
 * rather than guess
 */
export function useHyderabadWeather(): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => loadWeather().then(w => alive && setWeather(w));
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return weather;
}

const WORDS: Record<WeatherKind, string> = {
  clear: 'a clear',
  clouds: 'a cloudy',
  fog: 'a foggy',
  drizzle: 'a drizzly',
  rain: 'a rainy',
  storm: 'a stormy',
};

/** "Hi from a rainy Hyderabad, 24°", for the walker's wave */
export function weatherGreeting(weather: Weather) {
  return `hi from ${WORDS[weather.kind]} hyderabad, ${weather.temp}°`;
}
