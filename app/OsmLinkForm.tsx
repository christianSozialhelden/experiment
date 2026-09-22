"use client";

import { useEffect, useState } from "react";
import LibReviews from "./LibReviews";
import MangroveReviews from "./MangroveReviews";
import Panoramas from "./Panoramas";
import PlacePhotos from "./PlacePhotos";
import SafetyWarnings from "./SafetyWarnings";
import TransitDepartures from "./TransitDepartures";
import WeatherIcon from "./WeatherIcon";

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
  isDay: boolean;
};

const CAPITALS = [
  { name: "Berlin", lat: "52.5200", lon: "13.4050" },
  { name: "Bremen", lat: "53.0793", lon: "8.8017" },
  { name: "Dresden", lat: "51.0504", lon: "13.7373" },
  { name: "Düsseldorf", lat: "51.2277", lon: "6.7735" },
  { name: "Erfurt", lat: "50.9848", lon: "11.0299" },
  { name: "Hamburg", lat: "53.5511", lon: "9.9937" },
  { name: "Hannover", lat: "52.3759", lon: "9.7320" },
  { name: "Kiel", lat: "54.3233", lon: "10.1228" },
  { name: "Magdeburg", lat: "52.1205", lon: "11.6276" },
  { name: "Mainz", lat: "50.0000", lon: "8.2711" },
  { name: "München", lat: "48.1351", lon: "11.5820" },
  { name: "Potsdam", lat: "52.3906", lon: "13.0645" },
  { name: "Saarbrücken", lat: "49.2402", lon: "6.9969" },
  { name: "Schwerin", lat: "53.6355", lon: "11.4012" },
  { name: "Stuttgart", lat: "48.7758", lon: "9.1829" },
  { name: "Wiesbaden", lat: "50.0782", lon: "8.2398" },
];

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
            isDay: data.current_weather.is_day === 1,
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
    <div className="flex w-full flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-lg font-medium text-black dark:text-zinc-50">
          Landeshauptstadt wählen
        </legend>
        <div className="flex flex-wrap gap-3">
          {CAPITALS.map((city) => {
            const active = city.lat === lat && city.lon === lon;
            return (
              <button
                key={city.name}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setLat(city.lat);
                  setLon(city.lon);
                }}
                className={`min-h-12 rounded-lg border-2 px-4 py-2 text-lg transition-colors ${
                  active
                    ? "border-blue-800 bg-blue-800 font-semibold text-white dark:border-blue-300 dark:bg-blue-300 dark:text-black"
                    : "border-zinc-500 text-black hover:bg-black/[.06] dark:border-zinc-400 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-6">
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
      </div>
      <SafetyWarnings lat={latNum} lon={lonNum} enabled={isValid} />
      <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
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
          <MangroveReviews lat={latNum} lon={lonNum} enabled={isValid} />
        </div>
        <div className="flex flex-col gap-6">
          {isValid && (
            <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Aktuelles Wetter
              </h2>
              {current?.weather ? (
                <div className="mt-2 flex items-center gap-4">
                  <WeatherIcon
                    code={current.weather.code}
                    isDay={current.weather.isDay}
                    className="h-16 w-16 shrink-0 text-blue-800 dark:text-blue-300"
                  />
                  <div className="text-zinc-800 dark:text-zinc-200">
                    <p className="text-3xl font-semibold">
                      {current.weather.temperature} °C
                    </p>
                    <p>
                      {WEATHER_CODES[current.weather.code] ??
                        `Wettercode ${current.weather.code}`}
                    </p>
                    <p className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 shrink-0"
                      >
                        <path d="M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.7-8.3A2.5 2.5 0 1 1 19.5 12H2" />
                      </svg>
                      {current.weather.windSpeed} km/h
                    </p>
                  </div>
                </div>
              ) : current ? (
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                  Wetterdaten konnten nicht geladen werden.
                </p>
              ) : (
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
              )}
            </div>
          )}
          <PlacePhotos lat={latNum} lon={lonNum} enabled={isValid} />
        </div>
        <div className="flex flex-col gap-6">
          <TransitDepartures lat={latNum} lon={lonNum} enabled={isValid} />
        </div>
        <LibReviews enabled={isValid} />
        <Panoramas lat={latNum} lon={lonNum} enabled={isValid} />
      </div>
    </div>
  );
}
