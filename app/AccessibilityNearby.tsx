"use client";

import { useEffect, useState } from "react";
import { distanceInMeters } from "./photoSearch";

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type Wheelchair = "yes" | "limited" | "no";

type Place = {
  id: string;
  name: string;
  kind: string;
  wheelchair: Wheelchair;
  toilet: boolean;
  distance: number;
};

type Toilet = {
  id: string;
  name: string;
  wheelchair: Wheelchair | null;
  eurokey: boolean;
  fee: boolean | null;
  openingHours: string;
  distance: number;
};

type Defibrillator = {
  id: string;
  location: string;
  openingHours: string;
  indoor: boolean;
  distance: number;
};

type Result = {
  places: Place[];
  counts: Record<Wheelchair, number>;
  toilets: Toilet[];
  defibrillators: Defibrillator[];
};

type RawElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
};

const PLACE_RADIUS = 400;
const TOILET_RADIUS = 1000;
const AED_RADIUS = 1000;

// Der Hauptserver antwortet unter Last mit 502/504 oder braucht 30 s; dann der nächste.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const KINDS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  fast_food: "Imbiss",
  bar: "Bar",
  pub: "Kneipe",
  ice_cream: "Eisdiele",
  biergarten: "Biergarten",
  pharmacy: "Apotheke",
  doctors: "Arztpraxis",
  dentist: "Zahnarztpraxis",
  hospital: "Krankenhaus",
  clinic: "Klinik",
  bank: "Bank",
  atm: "Geldautomat",
  post_office: "Post",
  library: "Bibliothek",
  theatre: "Theater",
  cinema: "Kino",
  place_of_worship: "Gotteshaus",
  townhall: "Rathaus",
  community_centre: "Gemeinschaftszentrum",
  supermarket: "Supermarkt",
  bakery: "Bäckerei",
  convenience: "Späti",
  clothes: "Bekleidung",
  chemist: "Drogerie",
  books: "Buchhandlung",
  department_store: "Kaufhaus",
  museum: "Museum",
  hotel: "Hotel",
  hostel: "Hostel",
  gallery: "Galerie",
  attraction: "Sehenswürdigkeit",
  park: "Park",
  playground: "Spielplatz",
  fitness_centre: "Fitnessstudio",
};

const STATUS: Record<Wheelchair, { label: string; className: string }> = {
  yes: {
    label: "Rollstuhlgerecht",
    className:
      "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  },
  limited: {
    label: "Teilweise rollstuhlgerecht",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  no: {
    label: "Nicht rollstuhlgerecht",
    className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
};

// Nur bekannte Ortsarten und alle Geschäfte. Sonst landen Wartehäuschen, Parkplätze und
// Bänke in der Liste, die ebenfalls oft ein wheelchair-Tag und einen Namen tragen.
function kindOf(tags: Record<string, string>) {
  for (const key of ["amenity", "shop", "tourism", "leisure", "healthcare"]) {
    const value = tags[key];
    if (!value) continue;
    if (KINDS[value]) return KINDS[value];
    if (key === "shop") return "Geschäft";
  }
  return null;
}

// Öffnungszeiten stehen im OSM-Format („Mo-Sa 07:00-22:00; Su,PH off“); die gängigen
// Kürzel werden übersetzt, der Rest bleibt stehen.
const HOURS: [RegExp, string][] = [
  [/24\/7/g, "rund um die Uhr"],
  [/\bTu\b/g, "Di"],
  [/\bWe\b/g, "Mi"],
  [/\bTh\b/g, "Do"],
  [/\bSu\b/g, "So"],
  [/\bPH\b/g, "feiertags"],
  [/\boff\b/g, "geschlossen"],
  [/;\s*/g, ", "],
];

function openingHours(value: string | undefined) {
  return HOURS.reduce(
    (text, [pattern, german]) => text.replace(pattern, german),
    value ?? "",
  );
}

function asWheelchair(value: string | undefined): Wheelchair | null {
  return value === "yes" || value === "limited" || value === "no"
    ? value
    : null;
}

// Eine Abfrage für alle drei Listen spart Plätze: Overpass erlaubt nur zwei
// gleichzeitige Abfragen je Nutzer.
function buildQuery(lat: number, lon: number) {
  const at = (r: number) => `around:${r},${lat},${lon}`;
  return `[out:json][timeout:25];
(
  nwr(${at(PLACE_RADIUS)})["wheelchair"]["name"][~"^(amenity|shop|tourism|leisure|healthcare)$"~"."];
  nwr(${at(TOILET_RADIUS)})["amenity"="toilets"];
  nwr(${at(AED_RADIUS)})["emergency"="defibrillator"];
);
out center tags qt;`;
}

async function fetchOverpass(query: string, signal: AbortSignal) {
  let lastError: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.elements ?? []) as RawElement[];
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function parse(elements: RawElement[], lat: number, lon: number): Result {
  const places: Place[] = [];
  const toilets: Toilet[] = [];
  const defibrillators: Defibrillator[] = [];
  const counts: Record<Wheelchair, number> = { yes: 0, limited: 0, no: 0 };

  for (const el of elements) {
    const pos = el.center ?? (el.lat !== undefined ? el : null);
    if (!pos || pos.lat === undefined || pos.lon === undefined) continue;
    const distance = distanceInMeters(lat, lon, pos.lat, pos.lon);
    const id = `${el.type}/${el.id}`;
    const tags = el.tags;

    if (tags.emergency === "defibrillator") {
      defibrillators.push({
        id,
        location: tags["defibrillator:location"] ?? tags.description ?? "",
        openingHours: openingHours(tags.opening_hours),
        indoor: tags.indoor === "yes",
        distance,
      });
    } else if (tags.amenity === "toilets") {
      toilets.push({
        id,
        name: tags.name ?? "",
        wheelchair: asWheelchair(tags.wheelchair),
        eurokey: tags.centralkey === "eurokey",
        fee: tags.fee === "yes" ? true : tags.fee === "no" ? false : null,
        openingHours: openingHours(tags.opening_hours),
        distance,
      });
    } else {
      const wheelchair = asWheelchair(tags.wheelchair);
      const kind = kindOf(tags);
      if (!wheelchair || !kind) continue;
      counts[wheelchair]++;
      places.push({
        id,
        name: tags.name,
        kind,
        wheelchair,
        toilet: tags["toilets:wheelchair"] === "yes",
        distance,
      });
    }
  }

  const byDistance = (a: { distance: number }, b: { distance: number }) =>
    a.distance - b.distance;
  return {
    places: places.sort(byDistance).slice(0, 10),
    counts,
    // Rollstuhlgerechte Toiletten zuerst, innerhalb jeder Gruppe die nächste oben.
    toilets: toilets
      .sort(
        (a, b) =>
          Number(b.wheelchair === "yes") - Number(a.wheelchair === "yes") ||
          byDistance(a, b),
      )
      .slice(0, 6),
    defibrillators: defibrillators.sort(byDistance).slice(0, 4),
  };
}

function Badge({ status }: { status: Wheelchair }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${STATUS[status].className}`}
    >
      {STATUS[status].label}
    </span>
  );
}

const meters = (d: number) =>
  d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1)} km`;

export default function AccessibilityNearby({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    data: Result | null;
    error?: string;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    // Länger warten als bei den anderen Diensten: Ein abgebrochener Aufruf läuft auf dem
    // Server weiter und belegt einen der zwei Plätze, solange die Nadel gezogen wird.
    const timer = setTimeout(async () => {
      try {
        const elements = await fetchOverpass(
          buildQuery(lat, lon),
          controller.signal,
        );
        setResult({ key: coordKey, data: parse(elements, lat, lon) });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: coordKey,
          data: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 800);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, lat, lon, coordKey]);

  if (!enabled) return null;

  const wheelmapUrl = `https://wheelmap.org/?lat=${lat}&lon=${lon}&zoom=18`;
  const data = current?.data;

  return (
    <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Barrierefreiheit in der Nähe
      </h2>
      {current === null ? (
        <p
          role="status"
          className="mt-2 flex items-center gap-3 text-zinc-700 dark:text-zinc-300"
        >
          <span
            aria-hidden="true"
            className="h-6 w-6 shrink-0 rounded-full border-[3px] border-blue-800/25 border-t-blue-800 motion-safe:animate-spin dark:border-blue-300/25 dark:border-t-blue-300"
          />
          Lädt … (kann bis zu 30 Sekunden dauern)
        </p>
      ) : !data ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Daten konnten nicht geladen werden.
          {current.error && (
            <span className="mt-1 block text-base text-zinc-600 dark:text-zinc-400">
              OpenStreetMap (Overpass) meldet: {current.error}
            </span>
          )}
        </p>
      ) : (
        <div className="mt-3 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Orte im Umkreis von {PLACE_RADIUS} m
            </h3>
            <p className="text-base text-zinc-700 dark:text-zinc-300">
              {data.counts.yes} rollstuhlgerecht, {data.counts.limited}{" "}
              teilweise, {data.counts.no} nicht
            </p>
            {data.places.length === 0 ? (
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                Keine Angaben in der Nähe.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {data.places.map((p) => (
                  <li key={p.id}>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {p.name}
                    </p>
                    <p className="text-base text-zinc-700 dark:text-zinc-300">
                      {p.kind} · {meters(p.distance)}
                      {p.toilet && " · rollstuhlgerechtes WC"}
                    </p>
                    <Badge status={p.wheelchair} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Toiletten
            </h3>
            {data.toilets.length === 0 ? (
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                Keine öffentlichen Toiletten im Umkreis von 1 km.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {data.toilets.map((t) => (
                  <li key={t.id}>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {t.name || "Öffentliche Toilette"}
                    </p>
                    <p className="text-base text-zinc-700 dark:text-zinc-300">
                      {meters(t.distance)}
                      {t.eurokey && " · mit Euroschlüssel"}
                      {t.fee === true && " · kostenpflichtig"}
                      {t.fee === false && " · kostenlos"}
                      {t.openingHours && ` · ${t.openingHours}`}
                    </p>
                    {t.wheelchair ? (
                      <Badge status={t.wheelchair} />
                    ) : (
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        Barrierefreiheit unbekannt
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Defibrillatoren (AED)
            </h3>
            {data.defibrillators.length === 0 ? (
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                Keine eingetragen im Umkreis von 1 km.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {data.defibrillators.map((d) => (
                  <li key={d.id}>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {meters(d.distance)}
                      {d.indoor && " · im Gebäude"}
                    </p>
                    {(d.location || d.openingHours) && (
                      <p className="text-base text-zinc-700 dark:text-zinc-300">
                        {d.location}
                        {d.location && d.openingHours && " · "}
                        {d.openingHours}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-base text-zinc-700 dark:text-zinc-300">
              Im Notfall immer zuerst 112 anrufen.
            </p>
          </section>
        </div>
      )}
      <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
        Fehlt etwas oder stimmt nicht?{" "}
        <a
          href={wheelmapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Auf Wheelmap ergänzen
        </a>
        . Daten:{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OpenStreetMap-Mitwirkende
        </a>
        , ODbL
      </p>
    </div>
  );
}
