"use client";

import { useEffect, useState } from "react";
import { distanceInMeters } from "./photoSearch";

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type State = "ACTIVE" | "INACTIVE" | "UNKNOWN";

type Elevator = {
  id: number;
  description: string;
  state: State;
  explanation: string;
  distance: number;
};

type Station = {
  number: number;
  name: string;
  distance: number;
  elevators: Elevator[];
};

type RawFacility = {
  equipmentnumber: number;
  type: string;
  description?: string;
  geocoordX?: number;
  geocoordY?: number;
  state: State;
  stateExplanation?: string;
  stationnumber: number;
};

// Zugangsdaten aus dem DB API Marketplace (API „FaSta“). Wie der Mapillary-Token für den
// Browser gedacht, nur lesend und nach dem Build im JavaScript öffentlich einsehbar.
const CLIENT_ID = process.env.NEXT_PUBLIC_DB_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_DB_API_KEY;
const AVAILABLE = !!CLIENT_ID && !!API_KEY;

const BASE = "https://apis.deutschebahn.com/db-api-marketplace/apis/fasta/v2";
const RADIUS_KM = 1.5;

const STATE_LABELS: Record<State, { label: string; className: string }> = {
  ACTIVE: {
    label: "In Betrieb",
    className:
      "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  },
  INACTIVE: {
    label: "Außer Betrieb",
    className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
  UNKNOWN: {
    label: "Status unbekannt",
    className: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200",
  },
};

async function fetchFasta(path: string, signal: AbortSignal) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "DB-Client-Id": CLIENT_ID!, "DB-Api-Key": API_KEY! },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadStations(lat: number, lon: number, signal: AbortSignal) {
  const dLat = RADIUS_KM / 111.32;
  const dLon = RADIUS_KM / (111.32 * Math.cos((lat * Math.PI) / 180));
  // `area` erwartet Länge vor Breite: lon1,lat1,lon2,lat2.
  const params = new URLSearchParams({
    type: "ELEVATOR",
    area: [lon - dLon, lat - dLat, lon + dLon, lat + dLat]
      .map((n) => n.toFixed(5))
      .join(","),
  });
  const facilities: RawFacility[] = await fetchFasta(
    `/facilities?${params}`,
    signal,
  );

  const byStation = new Map<number, Elevator[]>();
  for (const f of facilities) {
    if (f.type !== "ELEVATOR") continue;
    const distance =
      f.geocoordX !== undefined && f.geocoordY !== undefined
        ? distanceInMeters(lat, lon, f.geocoordY, f.geocoordX)
        : Infinity;
    const list = byStation.get(f.stationnumber) ?? [];
    list.push({
      id: f.equipmentnumber,
      description: f.description ?? "Aufzug",
      state: f.state,
      explanation: f.stateExplanation ?? "",
      distance,
    });
    byStation.set(f.stationnumber, list);
  }

  // Die Aufzugsliste enthält keinen Bahnhofsnamen; den liefert /stations je Bahnhof.
  const stations = await Promise.all(
    [...byStation.entries()].map(async ([number, elevators]) => {
      const station = await fetchFasta(`/stations/${number}`, signal).catch(
        () => null,
      );
      return {
        number,
        name: station?.name ?? `Bahnhof ${number}`,
        distance: Math.min(...elevators.map((e) => e.distance)),
        // Außer Betrieb zuerst: Das ist die Information, nach der man sucht.
        elevators: elevators.sort(
          (a, b) =>
            Number(b.state === "INACTIVE") - Number(a.state === "INACTIVE"),
        ),
      };
    }),
  );
  return stations.sort((a, b) => a.distance - b.distance).slice(0, 3);
}

export default function StationElevators({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    stations: Station[] | null;
    error?: string;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!enabled || !AVAILABLE) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const stations = await loadStations(lat, lon, controller.signal);
        setResult({ key: coordKey, stations });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: coordKey,
          stations: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, lat, lon, coordKey]);

  if (!enabled) return null;

  if (!AVAILABLE) {
    return (
      <section className="rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-100 p-4 text-lg dark:border-zinc-600 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
            Aufzüge an Bahnhöfen
          </h2>
          <span className="rounded border border-zinc-500 px-2 py-0.5 text-sm font-medium text-zinc-700 dark:border-zinc-400 dark:text-zinc-300">
            Nicht verfügbar
          </span>
        </div>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Ob die Aufzüge an DB-Bahnhöfen in der Nähe funktionieren.
        </p>
        <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
          Keine Zugangsdaten für die DB-Schnittstelle hinterlegt.
        </p>
      </section>
    );
  }

  return (
    <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Aufzüge an Bahnhöfen
      </h2>
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.stations === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Aufzugsdaten konnten nicht geladen werden.
          {current.error && (
            <span className="mt-1 block text-base text-zinc-600 dark:text-zinc-400">
              DB meldet: {current.error}
            </span>
          )}
        </p>
      ) : current.stations.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Keine DB-Bahnhöfe mit Aufzügen im Umkreis von{" "}
          {RADIUS_KM.toLocaleString("de-DE")} km.
        </p>
      ) : (
        <div className="mt-3 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {current.stations.map((station) => (
            <section key={station.number}>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {station.name}
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {station.elevators.map((e) => (
                  <li key={e.id}>
                    <p className="text-base text-zinc-800 dark:text-zinc-200">
                      {e.description}
                    </p>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${STATE_LABELS[e.state].className}`}
                    >
                      {STATE_LABELS[e.state].label}
                    </span>
                    {e.state === "INACTIVE" && e.explanation && (
                      <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {e.explanation}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        Nur DB-Bahnhöfe, keine U-Bahn. Quelle: Deutsche Bahn (FaSta), Lizenz CC
        BY 4.0
      </p>
    </div>
  );
}
