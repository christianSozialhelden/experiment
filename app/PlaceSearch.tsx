"use client";

import { useEffect, useId, useState } from "react";

type Place = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
};

type Props = {
  onSelect: (lat: number, lon: number, name: string) => void;
};

type WikipediaPage = {
  pageid: number;
  title: string;
  index: number;
  description?: string;
  coordinates?: { lat: number; lon: number }[];
};

type NominatimPlace = {
  place_id: number;
  name: string;
  display_name: string;
  lat: string;
  lon: string;
};

// Vorschläge beim Tippen kommen aus der Präfixsuche der Wikipedia: Sie ist für
// Autovervollständigung gebaut und kennt Sehenswürdigkeiten, Bahnhöfe und Orte
// samt Koordinaten. Nominatim verbietet Autovervollständigung
// (https://operations.osmfoundation.org/policies/nominatim/) und sucht deshalb
// erst beim Absenden — dafür auch nach Adressen.
const WIKIPEDIA_API = "https://de.wikipedia.org/w/api.php";
const NOMINATIM_API = "https://nominatim.openstreetmap.org/search";
const MIN_LENGTH = 3;
const TIMEOUT_MS = 8000;

function fromNominatim(place: NominatimPlace): Place {
  const parts = place.display_name.split(", ");
  // display_name beginnt mit dem Namen; der Rest ist die Adresse. Reine
  // Adressen haben keinen Namen und beginnen mit der Hausnummer: „65,
  // Invalidenstraße, …“ wird zu „Invalidenstraße 65“.
  if (place.name) {
    if (parts[0] === place.name) parts.shift();
  } else if (/^\d/.test(parts[0]) && parts.length > 1) {
    const [number, street] = parts.splice(0, 2);
    parts.unshift(`${street} ${number}`);
  }
  const name = place.name || parts.shift() || place.display_name;
  return {
    id: String(place.place_id),
    name,
    description: parts.join(", "),
    lat: parseFloat(place.lat),
    lon: parseFloat(place.lon),
  };
}

export default function PlaceSearch({ onSelect }: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<{
    key: string;
    places: Place[] | null;
  } | null>(null);
  const [search, setSearch] = useState<{
    key: string;
    places: Place[] | null | "loading";
  } | null>(null);

  const q = query.trim();
  const active = q !== "" && q !== selected;
  const suggesting = active && q.length >= MIN_LENGTH;
  const currentSuggestions =
    suggesting && suggestions?.key === q ? suggestions : null;
  const currentSearch = active && search?.key === q ? search : null;
  const searchPlaces = Array.isArray(currentSearch?.places)
    ? currentSearch.places
    : null;
  const places = currentSearch
    ? (searchPlaces ?? [])
    : (currentSuggestions?.places ?? []);
  const expanded = open && places.length > 0;

  useEffect(() => {
    if (!suggesting) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          action: "query",
          generator: "prefixsearch",
          gpssearch: q,
          gpslimit: "20",
          gpsnamespace: "0",
          prop: "coordinates|description",
          redirects: "1",
          format: "json",
          formatversion: "2",
          origin: "*",
        });
        const res = await fetch(`${WIKIPEDIA_API}?${params}`, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(TIMEOUT_MS),
          ]),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const pages: WikipediaPage[] = data.query?.pages ?? [];
        // Nur Artikel mit Koordinaten sind Orte; Personen und Begriffe fallen
        // raus. Die Präfixsuche ist unscharf und folgt Weiterleitungen („Eiffelt“
        // liefert auch „Eisfeld“ und „Altnauer Steg“), darum muss der Titel
        // wirklich mit der Eingabe beginnen.
        const prefix = q.toLocaleLowerCase("de");
        const found = pages
          .filter(
            (page) =>
              page.coordinates?.length &&
              page.title.toLocaleLowerCase("de").startsWith(prefix),
          )
          .sort((a, b) => a.index - b.index)
          .slice(0, 8)
          .map((page) => ({
            id: String(page.pageid),
            name: page.title,
            description: page.description ?? "",
            lat: page.coordinates![0].lat,
            lon: page.coordinates![0].lon,
          }));
        setSuggestions({ key: q, places: found });
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions({ key: q, places: null });
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [suggesting, q]);

  function select(place: Place) {
    onSelect(place.lat, place.lon, place.name);
    setSelected(place.name);
    setQuery(place.name);
    setOpen(false);
    setActiveIndex(-1);
  }

  async function searchNominatim(e: React.FormEvent) {
    e.preventDefault();
    if (q === "" || currentSearch?.places === "loading") return;

    const key = q;
    setSearch({ key, places: "loading" });
    setOpen(true);
    setActiveIndex(-1);
    try {
      const params = new URLSearchParams({
        q: key,
        format: "jsonv2",
        limit: "8",
        "accept-language": "de",
      });
      const res = await fetch(`${NOMINATIM_API}?${params}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NominatimPlace[] = await res.json();
      setSearch({ key, places: data.map(fromNominatim) });
    } catch {
      setSearch({ key, places: null });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, places.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && expanded && activeIndex >= 0) {
      // Ohne markierten Vorschlag schickt Enter das Formular ab.
      e.preventDefault();
      select(places[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const count = (n: number) => (n === 1 ? "1 Treffer" : `${n} Treffer`);
  let status = "";
  if (selected && q === selected) status = `Ausgewählt: ${selected}`;
  else if (currentSearch?.places === "loading") status = "Sucht …";
  else if (currentSearch?.places === null)
    status = "Die Suche konnte nicht geladen werden.";
  else if (searchPlaces?.length === 0) status = "Keine Orte gefunden.";
  else if (searchPlaces)
    status = `${count(searchPlaces.length)}. Bitte einen auswählen.`;
  else if (suggesting && currentSuggestions === null) status = "Sucht …";
  else if (currentSuggestions?.places === null)
    status =
      "Vorschläge konnten nicht geladen werden. Mit „Suchen“ trotzdem suchen.";
  else if (currentSuggestions?.places.length === 0)
    status = "Keine Vorschläge. „Suchen“ findet auch Adressen.";
  else if (currentSuggestions)
    status = `${count(places.length)}. Mit Pfeiltasten auswählen oder „Suchen“ für Adressen.`;

  return (
    <div className="flex flex-col gap-2">
      <form
        role="search"
        onSubmit={searchNominatim}
        className="flex flex-col gap-2"
      >
        {/* Quellenangabe neben dem Label statt in einer eigenen Zeile, damit
            die Karte weiter nach oben rückt. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <label
            htmlFor={`${listId}-input`}
            className="text-lg font-medium text-black dark:text-zinc-50"
          >
            Ort suchen
          </label>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Quellen:{" "}
            <a
              href="https://de.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Wikipedia
            </a>
            ,{" "}
            <a
              href="https://nominatim.openstreetmap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Nominatim
            </a>
            ,{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              © OpenStreetMap
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-0 flex-1 basis-64">
            <input
              id={`${listId}-input`}
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-activedescendant={
                expanded && activeIndex >= 0
                  ? `${listId}-${activeIndex}`
                  : undefined
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpen(true);
                setActiveIndex(-1);
              }}
              onKeyDown={onKeyDown}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              placeholder="z. B. Eiffelturm oder Invalidenstraße 65, Berlin"
              autoComplete="off"
              className="w-full rounded-lg border-2 border-zinc-500 px-4 py-3 text-xl dark:border-zinc-400 dark:bg-black dark:text-zinc-50"
            />
            <ul
              id={listId}
              role="listbox"
              aria-label="Treffer"
              hidden={!expanded}
              // Leaflet legt seine Bedienelemente auf z-index 1000.
              className="absolute inset-x-0 top-full z-[1100] mt-1 max-h-96 overflow-y-auto rounded-lg border-2 border-zinc-500 bg-white shadow-lg dark:border-zinc-400 dark:bg-black"
            >
              {places.map((place, index) => (
                <li
                  key={place.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // mousedown statt click, damit das Feld nicht vorher den
                  // Fokus verliert und die Liste schließt.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(place);
                  }}
                  onMouseMove={() => setActiveIndex(index)}
                  className={`flex min-h-12 cursor-pointer flex-col justify-center px-4 py-2 text-lg text-black dark:text-zinc-50 ${
                    index === activeIndex
                      ? "bg-black/[.08] dark:bg-[#1f1f1f]"
                      : ""
                  }`}
                >
                  <span className="font-semibold">{place.name}</span>
                  {place.description && (
                    <span className="text-base text-zinc-700 dark:text-zinc-300">
                      {place.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="submit"
            disabled={currentSearch?.places === "loading"}
            className="min-h-12 rounded-lg border-2 border-blue-800 bg-blue-800 px-6 py-2 text-lg font-semibold text-white disabled:opacity-60 dark:border-blue-300 dark:bg-blue-300 dark:text-black"
          >
            Suchen
          </button>
        </div>
      </form>
      {/* Feste Höhe von einer Zeile, damit die Karte darunter nicht springt,
          wenn eine Meldung erscheint. */}
      <p
        aria-live="polite"
        className="min-h-6 text-base text-zinc-700 dark:text-zinc-300"
      >
        {status}
      </p>
    </div>
  );
}
