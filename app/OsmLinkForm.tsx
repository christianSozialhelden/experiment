"use client";

import { useEffect, useState } from "react";
import TransitDepartures from "./TransitDepartures";

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

  const coordKey = `${latNum},${lonNum}`;
  const [result, setResult] = useState<{
    key: string;
    weather: Weather | null;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!isValid) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&current_weather=true`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult({
          key: coordKey,
          weather: {
            temperature: data.current_weather.temperature,
            windSpeed: data.current_weather.windspeed,
            code: data.current_weather.weathercode,
          },
        });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key: coordKey, weather: null });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isValid, latNum, lonNum, coordKey]);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <label className="flex flex-col gap-2 text-lg font-medium text-black dark:text-zinc-50">
        Breitengrad (lat)
        <input
          type="text"
          inputMode="decimal"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="z. B. 52.5200"
          className="rounded-lg border-2 border-zinc-500 px-4 py-3 text-xl dark:border-zinc-400 dark:bg-black dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-2 text-lg font-medium text-black dark:text-zinc-50">
        Längengrad (lon)
        <input
          type="text"
          inputMode="decimal"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder="z. B. 13.4050"
          className="rounded-lg border-2 border-zinc-500 px-4 py-3 text-xl dark:border-zinc-400 dark:bg-black dark:text-zinc-50"
        />
      </label>
      {embedUrl && (
        <iframe
          key={embedUrl}
          src={embedUrl}
          title="Karte von OpenStreetMap"
          loading="lazy"
          className="h-96 w-full rounded-lg border-2 border-zinc-500 dark:border-zinc-400"
        />
      )}
      {osmUrl ? (
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center gap-3 text-xl font-medium text-blue-800 underline decoration-2 underline-offset-4 dark:text-blue-300"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 shrink-0"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Auf OpenStreetMap öffnen
        </a>
      ) : (
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          Bitte gültige Koordinaten eingeben.
        </p>
      )}
      {isValid && (
        <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            Aktuelles Wetter
          </h2>
          {current?.weather ? (
            <p className="mt-2 text-zinc-700 dark:text-zinc-300">
              {WEATHER_CODES[current.weather.code] ??
                `Wettercode ${current.weather.code}`}
              , {current.weather.temperature} °C, Wind{" "}
              {current.weather.windSpeed} km/h
            </p>
          ) : current ? (
            <p className="mt-2 text-zinc-700 dark:text-zinc-300">
              Wetterdaten konnten nicht geladen werden.
            </p>
          ) : (
            <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
          )}
        </div>
      )}
      <TransitDepartures lat={latNum} lon={lonNum} enabled={isValid} />
    </div>
  );
}
