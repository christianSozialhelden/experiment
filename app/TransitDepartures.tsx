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
    <div className="rounded border border-black/[.08] p-3 text-sm dark:border-white/[.145]">
      <h2 className="font-medium text-black dark:text-zinc-50">
        Abfahrten (ÖPNV &amp; Bahn)
      </h2>
      {current?.stopName && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {current.stopName}
        </p>
      )}
      {current === null ? (
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Lädt …</p>
      ) : current.departures === null ? (
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Verkehrsdaten konnten nicht geladen werden.
        </p>
      ) : current.departures.length === 0 ? (
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Keine Haltestelle in der Nähe gefunden.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {current.departures.map((d) => {
            const delayMinutes = Math.round(
              (new Date(d.departure).getTime() -
                new Date(d.scheduledDeparture).getTime()) /
                60000,
            );
            return (
              <li key={d.tripId} className="flex items-baseline gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: d.color || "#3f3f46" }}
                >
                  {d.line || MODE_LABELS[d.mode] || d.mode}
                </span>
                <span className="flex-1 text-zinc-700 dark:text-zinc-300">
                  {d.headsign}
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {MODE_LABELS[d.mode] ?? d.mode}
                  </span>
                </span>
                <span className="whitespace-nowrap tabular-nums text-zinc-700 dark:text-zinc-300">
                  {d.cancelled ? (
                    <span className="text-red-600 dark:text-red-400">
                      fällt aus
                    </span>
                  ) : (
                    <>
                      {new Date(d.departure).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {delayMinutes > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {" "}
                          +{delayMinutes}
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
