"use client";

import { useEffect, useState } from "react";
import LocationMap from "./LocationMap";
import MangroveReviews from "./MangroveReviews";
import PlacePicker, { initialGroupIndex, SAVED_INDEX } from "./PlacePicker";
import PlaceSearch from "./PlaceSearch";
import SafetyWarnings from "./SafetyWarnings";
import SavePlaceButton from "./SavePlaceButton";
import StreetPhotos from "./StreetPhotos";
import TransitDepartures from "./TransitDepartures";
import WeatherIcon from "./WeatherIcon";
import WikidataArticles from "./WikidataArticles";

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
  days: {
    date: Date;
    code: number;
    max: number;
    min: number;
    rainChance: number | null;
  }[];
};

// Open-Meteo liefert Tage als "2026-10-23" in Ortszeit; `new Date("…")` würde das als
// Mitternacht UTC lesen und westlich von Greenwich den Vortag anzeigen.
function parseDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function OsmLinkForm() {
  const [lat, setLat] = useState("52.5200");
  const [lon, setLon] = useState("13.4050");
  const [placeName, setPlaceName] = useState<string | null>("Berlin");
  const [groupIndex, setGroupIndex] = useState(() =>
    initialGroupIndex("52.5200", "13.4050"),
  );

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
          `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const daily = data.daily;
        setResult({
          key: coordKey,
          weather: {
            temperature: data.current_weather.temperature,
            windSpeed: data.current_weather.windspeed,
            code: data.current_weather.weathercode,
            isDay: data.current_weather.is_day === 1,
            // Ab morgen; heute steht schon als aktuelles Wetter da.
            days: (daily?.time ?? [])
              .slice(1)
              .map((day: string, i: number) => ({
                date: parseDay(day),
                code: daily.weathercode[i + 1],
                max: Math.round(daily.temperature_2m_max[i + 1]),
                min: Math.round(daily.temperature_2m_min[i + 1]),
                rainChance:
                  daily.precipitation_probability_max?.[i + 1] ?? null,
              })),
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
      <div className="grid items-start gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto]">
        <div className="sm:col-span-2 lg:col-span-1">
          <PlaceSearch
            onSelect={(newLat, newLon, name) => {
              setLat(newLat.toFixed(5));
              setLon(newLon.toFixed(5));
              setPlaceName(name);
            }}
          />
        </div>
        <label className="flex flex-col gap-2 text-lg font-medium text-black dark:text-zinc-50">
          Breitengrad (lat)
          <input
            type="text"
            inputMode="decimal"
            value={lat}
            onChange={(e) => {
              setLat(e.target.value);
              setPlaceName(null);
            }}
            placeholder="z. B. 52.5200"
            className="w-full rounded-lg border-2 border-zinc-500 px-4 py-3 text-xl dark:border-zinc-400 dark:bg-black dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-2 text-lg font-medium text-black dark:text-zinc-50">
          Längengrad (lon)
          <input
            type="text"
            inputMode="decimal"
            value={lon}
            onChange={(e) => {
              setLon(e.target.value);
              setPlaceName(null);
            }}
            placeholder="z. B. 13.4050"
            className="w-full rounded-lg border-2 border-zinc-500 px-4 py-3 text-xl dark:border-zinc-400 dark:bg-black dark:text-zinc-50"
          />
        </label>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:items-start lg:col-span-1">
          {/* Platzhalter in Label-Höhe, damit der Button auf einer Linie mit
              den Eingabefeldern steht. */}
          <span aria-hidden="true" className="hidden text-lg lg:block">
            &nbsp;
          </span>
          <SavePlaceButton
            lat={lat}
            lon={lon}
            name={placeName}
            enabled={isValid}
            onSaved={() => setGroupIndex(SAVED_INDEX)}
          />
        </div>
      </div>
      {isValid && (
        <LocationMap
          lat={latNum}
          lon={lonNum}
          onMove={(newLat, newLon) => {
            setLat(newLat.toFixed(5));
            setLon(newLon.toFixed(5));
            setPlaceName(null);
          }}
        />
      )}
      <PlacePicker
        lat={lat}
        lon={lon}
        groupIndex={groupIndex}
        onGroupChange={setGroupIndex}
        onSelect={(newLat, newLon, name) => {
          setLat(newLat);
          setLon(newLon);
          setPlaceName(name);
        }}
      />
      <SafetyWarnings enabled={isValid} />
      {isValid && (
        <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            Wetter
          </h2>
          {current?.weather ? (
            // Immer eine Zeile: Reicht die Breite nicht (Handy), lässt sie sich seitlich
            // wischen; der ausgeblendete rechte Rand zeigt, dass noch mehr kommt.
            // tabIndex, damit das auch per Tastatur geht.
            <div
              tabIndex={0}
              className="mt-2 flex items-center gap-6 overflow-x-auto pb-2 max-md:[mask-image:linear-gradient(to_right,black_85%,transparent)]"
            >
              <div className="flex shrink-0 items-center gap-4">
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
              {current.weather.days.length > 0 && (
                <ul
                  aria-label="Vorhersage für die nächsten Tage"
                  className="flex flex-1 gap-4"
                >
                  {current.weather.days.map((day) => (
                    <li
                      key={day.date.toISOString()}
                      className="flex min-w-20 flex-1 flex-col items-center text-center text-zinc-800 dark:text-zinc-200"
                    >
                      <p className="font-semibold">
                        {day.date.toLocaleDateString("de-DE", {
                          weekday: "short",
                        })}
                        <span className="block text-sm font-normal text-zinc-700 dark:text-zinc-300">
                          {day.date.toLocaleDateString("de-DE", {
                            day: "numeric",
                            month: "numeric",
                          })}
                        </span>
                      </p>
                      <WeatherIcon
                        code={day.code}
                        isDay
                        className="my-1 h-10 w-10 text-blue-800 dark:text-blue-300"
                      />
                      <p className="text-base">
                        {WEATHER_CODES[day.code] ?? `Wettercode ${day.code}`}
                      </p>
                      <p className="tabular-nums">
                        <span className="font-semibold">{day.max}°</span>{" "}
                        <span className="text-zinc-700 dark:text-zinc-300">
                          / {day.min}°
                        </span>
                      </p>
                      {day.rainChance !== null && (
                        <p className="whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                          Regen {day.rainChance} %
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
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
      {osmUrl ? (
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center gap-3 self-start text-xl font-medium text-blue-800 underline decoration-2 underline-offset-4 dark:text-blue-300"
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
      <StreetPhotos lat={latNum} lon={lonNum} enabled={isValid} />
      <TransitDepartures lat={latNum} lon={lonNum} enabled={isValid} />
      <WikidataArticles lat={latNum} lon={lonNum} enabled={isValid} />
      <MangroveReviews lat={latNum} lon={lonNum} enabled={isValid} />
    </div>
  );
}
