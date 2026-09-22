"use client";

import { useEffect, useState } from "react";

const MODE_LABELS: Record<string, string> = {
  HIGHSPEED_RAIL: "ICE",
  LONG_DISTANCE: "IC/EC",
  NIGHT_RAIL: "Nachtzug",
  REGIONAL_FAST_RAIL: "Regional-Express",
  REGIONAL_RAIL: "Regionalbahn",
  METRO: "S-Bahn",
  SUBWAY: "U-Bahn",
  TRAM: "Tram",
  BUS: "Bus",
  COACH: "Fernbus",
  FERRY: "Fähre",
};

type Departure = {
  tripId: string;
  line: string;
  headsign: string;
  mode: string;
  color: string;
  textColor: string;
  departure: string;
  scheduledDeparture: string;
  cancelled: boolean;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

export default function TransitDepartures({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    stopName: string;
    departures: Departure[] | null;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const geoRes = await fetch(
          `https://api.transitous.org/api/v1/reverse-geocode?place=${lat},${lon}`,
          { signal: controller.signal },
        );
        if (!geoRes.ok) throw new Error(`HTTP ${geoRes.status}`);
        const places = await geoRes.json();
        const stop = places.find((p: { type: string }) => p.type === "STOP");
        if (!stop) {
          setResult({ key: coordKey, stopName: "", departures: [] });
          return;
        }

        const params = new URLSearchParams({ stopId: stop.id, n: "8" });
        const res = await fetch(
          `https://api.transitous.org/api/v1/stoptimes?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult({
          key: coordKey,
          stopName: stop.name,
          departures: data.stopTimes.map(
            (s: {
              tripId: string;
              displayName?: string;
              routeShortName?: string;
              headsign: string;
              mode: string;
              routeColor?: string;
              routeTextColor?: string;
              cancelled: boolean;
              place: {
                name: string;
                departure: string;
                scheduledDeparture: string;
              };
            }) => ({
              tripId: s.tripId,
              line: s.displayName ?? s.routeShortName ?? "",
              headsign: s.headsign,
              mode: s.mode,
              color: s.routeColor ? `#${s.routeColor}` : "",
              textColor: s.routeTextColor ? `#${s.routeTextColor}` : "",
              departure: s.place.departure,
              scheduledDeparture: s.place.scheduledDeparture,
              cancelled: s.cancelled,
            }),
          ),
        });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key: coordKey, stopName: "", departures: null });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, lat, lon, coordKey]);

  if (!enabled) return null;

  return (
    <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Abfahrten (ÖPNV &amp; Bahn)
      </h2>
      {current?.stopName && (
        <p className="text-zinc-700 dark:text-zinc-300">{current.stopName}</p>
      )}
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.departures === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Verkehrsdaten konnten nicht geladen werden.
        </p>
      ) : current.departures.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Keine Haltestelle in der Nähe gefunden.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {current.departures.map((d) => {
            const delayMinutes = Math.round(
              (new Date(d.departure).getTime() -
                new Date(d.scheduledDeparture).getTime()) /
                60000,
            );
            return (
              <li key={d.tripId} className="flex items-baseline gap-3">
                <span
                  className="rounded px-2 py-1 font-semibold"
                  style={{
                    backgroundColor: d.color || "#27272a",
                    color: d.textColor || "#ffffff",
                  }}
                >
                  {d.line || MODE_LABELS[d.mode] || d.mode}
                </span>
                <span className="flex-1 text-zinc-800 dark:text-zinc-200">
                  {d.headsign}
                  <span className="block text-base text-zinc-700 dark:text-zinc-300">
                    {MODE_LABELS[d.mode] ?? d.mode}
                  </span>
                </span>
                <span className="whitespace-nowrap tabular-nums text-zinc-800 dark:text-zinc-200">
                  {d.cancelled ? (
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      fällt aus
                    </span>
                  ) : (
                    <>
                      {new Date(d.departure).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {delayMinutes > 0 && (
                        <span className="font-semibold text-red-700 dark:text-red-300">
                          {" "}
                          +{delayMinutes} Min
                        </span>
                      )}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
