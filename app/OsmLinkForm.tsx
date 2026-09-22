"use client";

import { useEffect, useState } from "react";

const WEATHER_CODES: Record<number, string> = {
  0: "Klar",
  1: "Überwiegend klar",
  2: "Teilweise bewölkt",
  3: "Bedeckt",
  45: "Nebel",
  48: "Reifnebel",
  51: "Leichter Nieselregen",
  53: "Nieselregen",
  55: "Starker Nieselregen",
  56: "Gefrierender Nieselregen",
  57: "Starker gefrierender Nieselregen",
  61: "Leichter Regen",
  63: "Regen",
  65: "Starker Regen",
  66: "Gefrierender Regen",
  67: "Starker gefrierender Regen",
  71: "Leichter Schneefall",
  73: "Schneefall",
  75: "Starker Schneefall",
  77: "Schneegriesel",
  80: "Leichte Regenschauer",
  81: "Regenschauer",
  82: "Starke Regenschauer",
  85: "Leichte Schneeschauer",
  86: "Starke Schneeschauer",
  95: "Gewitter",
  96: "Gewitter mit leichtem Hagel",
  99: "Gewitter mit starkem Hagel",
};

type Weather = {
  temperature: number;
  windSpeed: number;
  code: number;
};

export default function OsmLinkForm() {
  const [lat, setLat] = useState("52.5200");
  const [lon, setLon] = useState("13.4050");

  const latNum = parseFloat(lat.replace(",", "."));
  const lonNum = parseFloat(lon.replace(",", "."));
  const isValid =
    lat.trim() !== "" &&
    lon.trim() !== "" &&
    !Number.isNaN(latNum) &&
    !Number.isNaN(lonNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lonNum >= -180 &&
    lonNum <= 180;

  const osmUrl = isValid
    ? `https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lonNum}#map=18/${latNum}/${lonNum}`
    : null;

  const embedUrl = isValid
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(lonNum - 0.005).toFixed(6)},${(latNum - 0.0025).toFixed(6)},${(lonNum + 0.005).toFixed(6)},${(latNum + 0.0025).toFixed(6)}&layer=mapnik&marker=${latNum},${lonNum}`
    : null;

  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState(false);

  useEffect(() => {
    if (!isValid) {
      setWeather(null);
      setWeatherError(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&current_weather=true`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setWeather({
          temperature: data.current_weather.temperature,
          windSpeed: data.current_weather.windspeed,
          code: data.current_weather.weathercode,
        });
        setWeatherError(false);
      } catch {
        if (controller.signal.aborted) return;
        setWeather(null);
        setWeatherError(true);
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isValid, latNum, lonNum]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <label className="flex flex-col gap-1 text-sm font-medium text-black dark:text-zinc-50">
        Breitengrad (lat)
        <input
          type="text"
          inputMode="decimal"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="z. B. 52.5200"
          className="rounded border border-black/[.15] px-3 py-2 text-base dark:border-white/[.2] dark:bg-black dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-black dark:text-zinc-50">
        Längengrad (lon)
        <input
          type="text"
          inputMode="decimal"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder="z. B. 13.4050"
          className="rounded border border-black/[.15] px-3 py-2 text-base dark:border-white/[.2] dark:bg-black dark:text-zinc-50"
        />
      </label>
      {embedUrl && (
        <iframe
          key={embedUrl}
          src={embedUrl}
          title="Karte von OpenStreetMap"
          loading="lazy"
          className="h-64 w-full rounded border border-black/[.15] dark:border-white/[.2]"
        />
      )}
      {osmUrl ? (
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-medium text-zinc-950 underline dark:text-zinc-50"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Auf OpenStreetMap öffnen
        </a>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Bitte gültige Koordinaten eingeben.
        </p>
      )}
      {isValid && (
        <div className="rounded border border-black/[.08] p-3 text-sm dark:border-white/[.145]">
          <h2 className="font-medium text-black dark:text-zinc-50">
            Aktuelles Wetter
          </h2>
          {weather ? (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {WEATHER_CODES[weather.code] ?? `Wettercode ${weather.code}`},{" "}
              {weather.temperature} °C, Wind {weather.windSpeed} km/h
            </p>
          ) : weatherError ? (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Wetterdaten konnten nicht geladen werden.
            </p>
          ) : (
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">Lädt …</p>
          )}
        </div>
      )}
    </div>
  );
}
