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

// Rollstuhl-Symbol für die Angabe hinter der Haltestelle; die Bedeutung steht als
// Text daneben.
function WheelchairIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline h-4 w-4 align-[-2px]"
    >
      <circle cx="11" cy="4" r="1.6" />
      <path d="M11 7v6h5l2 5M11 10h4" />
      <path d="M8.5 11.5a5 5 0 1 0 7 6" />
    </svg>
  );
}

type Departure = {
  id: string;
  line: string;
  headsign: string;
  mode: string;
  color: string;
  textColor: string;
  stopName: string;
  departure: string;
  scheduledDeparture: string;
  cancelled: boolean;
  // Aus GTFS `wheelchair_accessible` der Fahrt; null, wenn unbekannt.
  wheelchair: boolean | null;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type NearbyStop = { stopId: string; name: string; lat: number; lon: number };

type RawStopTime = {
  tripId: string;
  displayName?: string;
  routeShortName?: string;
  headsign: string;
  mode: string;
  routeColor?: string;
  routeTextColor?: string;
  cancelled: boolean;
  wheelchairAccessible?: string;
  place: {
    name: string;
    stopId: string;
    departure: string;
    scheduledDeparture: string;
  };
};

function distanceMeters(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
) {
  const latMeters = (bLat - aLat) * 111320;
  const lonMeters = (bLon - aLon) * 111320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(latMeters, lonMeters);
}

async function findNearestStop(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<NearbyStop | null> {
  for (const radiusKm of [1, 5, 20]) {
    const dLat = radiusKm / 111.32;
    const dLon = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const params = new URLSearchParams({
      min: `${lat - dLat},${lon - dLon}`,
      max: `${lat + dLat},${lon + dLon}`,
    });
    const res = await fetch(
      `https://api.transitous.org/api/v1/map/stops?${params}`,
      { signal },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stops: NearbyStop[] = await res.json();
    if (stops.length > 0) {
      return stops.reduce((nearest, stop) =>
        distanceMeters(lat, lon, stop.lat, stop.lon) <
        distanceMeters(lat, lon, nearest.lat, nearest.lon)
          ? stop
          : nearest,
      );
    }
  }
  return null;
}

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
        const stop = await findNearestStop(lat, lon, controller.signal);
        if (!stop) {
          setResult({ key: coordKey, stopName: "", departures: [] });
          return;
        }

        const params = new URLSearchParams({
          stopId: stop.stopId,
          n: "12",
          radius: "600",
        });
        const res = await fetch(
          `https://api.transitous.org/api/v1/stoptimes?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult({
          key: coordKey,
          stopName: stop.name,
          departures: (data.stopTimes as RawStopTime[])
            .slice(0, 12)
            .map((s) => ({
              id: `${s.tripId}|${s.place.stopId}|${s.place.departure}`,
              line: s.displayName ?? s.routeShortName ?? "",
              headsign: s.headsign,
              mode: s.mode,
              color: s.routeColor ? `#${s.routeColor}` : "",
              textColor: s.routeTextColor ? `#${s.routeTextColor}` : "",
              stopName: s.place.name,
              departure: s.place.departure,
              scheduledDeparture: s.place.scheduledDeparture,
              cancelled: s.cancelled,
              wheelchair:
                s.wheelchairAccessible === "ACCESSIBLE"
                  ? true
                  : s.wheelchairAccessible === "NOT_ACCESSIBLE"
                    ? false
                    : null,
            })),
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
        <p className="text-zinc-700 dark:text-zinc-300">
          Haltestellen um {current.stopName}
        </p>
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
        // Volle Breite: Abfahrten in Spalten, von oben nach unten gelesen, damit die
        // zeitliche Reihenfolge erhalten bleibt.
        <ul className="mt-3 gap-x-8 md:columns-2 xl:columns-3 [&>li]:mb-3 [&>li]:break-inside-avoid">
          {current.departures.map((d) => {
            const delayMinutes = Math.round(
              (new Date(d.departure).getTime() -
                new Date(d.scheduledDeparture).getTime()) /
                60000,
            );
            return (
              <li key={d.id} className="flex items-baseline gap-3">
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
                    {MODE_LABELS[d.mode] ?? d.mode} · {d.stopName}
                    {d.wheelchair === true && (
                      <span className="text-green-800 dark:text-green-300">
                        {" "}
                        · <WheelchairIcon /> stufenlos
                      </span>
                    )}
                    {d.wheelchair === false && (
                      <span className="font-semibold text-red-700 dark:text-red-300">
                        {" "}
                        · <WheelchairIcon /> nicht stufenlos
                      </span>
                    )}
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
