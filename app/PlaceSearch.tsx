"use client";

import { useState } from "react";

type Place = {
  id: number;
  name: string;
  description: string;
  lat: number;
  lon: number;
};

type Props = {
  onSelect: (lat: number, lon: number) => void;
};

type RawPlace = {
  place_id: number;
  name: string;
  display_name: string;
  lat: string;
  lon: string;
};

// Nominatim verbietet Autovervollständigung, deshalb wird erst beim Absenden
// gesucht: https://operations.osmfoundation.org/policies/nominatim/
const API = "https://nominatim.openstreetmap.org/search";

export default function PlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "done"
  >("idle");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q === "" || status === "loading") return;

    setStatus("loading");
    setSelected(null);
    try {
      const params = new URLSearchParams({
        q,
        format: "jsonv2",
        limit: "8",
        "accept-language": "de",
      });
      const res = await fetch(`${API}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RawPlace[] = await res.json();
      setPlaces(
        data.map((p) => {
          // display_name beginnt mit dem Namen; der Rest ist die Adresse.
          const name = p.name || p.display_name.split(", ")[0];
          return {
            id: p.place_id,
            name,
            description: p.display_name.startsWith(`${name}, `)
              ? p.display_name.slice(name.length + 2)
              : p.display_name,
            lat: parseFloat(p.lat),
            lon: parseFloat(p.lon),
          };
        }),
      );
      setStatus("done");
    } catch {
      setPlaces([]);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form role="search" onSubmit={search} className="flex flex-col gap-2">
        <label
          htmlFor="place-search"
          className="text-lg font-medium text-black dark:text-zinc-50"
        >
          Ort suchen
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id="place-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="z. B. Alexanderplatz Berlin"
            autoComplete="off"
            className="min-w-0 flex-1 basis-64 rounded-lg border-2 border-zinc-500 px-4 py-3 text-xl dark:border-zinc-400 dark:bg-black dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="min-h-12 rounded-lg border-2 border-blue-800 bg-blue-800 px-6 py-2 text-lg font-semibold text-white disabled:opacity-60 dark:border-blue-300 dark:bg-blue-300 dark:text-black"
          >
            Suchen
          </button>
        </div>
      </form>
      <div aria-live="polite" className="text-lg text-zinc-700 dark:text-zinc-300">
        {status === "loading" && <p>Sucht …</p>}
        {status === "error" && <p>Die Suche konnte nicht geladen werden.</p>}
        {status === "done" && places.length === 0 && (
          <p>Keine Orte gefunden.</p>
        )}
        {status === "done" && places.length > 0 && !selected && (
          <p>
            {places.length === 1
              ? "1 Ort gefunden. Bitte auswählen."
              : `${places.length} Orte gefunden. Bitte einen auswählen.`}
          </p>
        )}
        {selected && <p>Ausgewählt: {selected}</p>}
      </div>
      {status === "done" && places.length > 0 && !selected && (
        <ul className="flex flex-col gap-2">
          {places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(place.lat, place.lon);
                  setSelected(place.name);
                  setQuery(place.name);
                }}
                className="flex min-h-12 w-full flex-col items-start rounded-lg border-2 border-zinc-500 px-4 py-2 text-left text-lg text-black hover:bg-black/[.06] dark:border-zinc-400 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
              >
                <span className="font-semibold">{place.name}</span>
                {place.description && (
                  <span className="text-base text-zinc-700 dark:text-zinc-300">
                    {place.description}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Suche:{" "}
        <a
          href="https://nominatim.openstreetmap.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Nominatim
        </a>
        , Daten © OpenStreetMap-Mitwirkende
      </p>
    </div>
  );
}
