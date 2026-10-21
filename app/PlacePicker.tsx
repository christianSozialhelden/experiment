"use client";

import { useEffect, useId, useRef, useState } from "react";
import { removePlace, useSavedPlaces } from "./savedPlaces";

type Place = { name: string; lat: string; lon: string };

type Props = {
  lat: string;
  lon: string;
  // Aktiver Reiter liegt beim Aufrufer, damit „Ort speichern“ neben der Suche
  // den Reiter „Gespeichert“ öffnen kann.
  groupIndex: number;
  onGroupChange: (index: number) => void;
  onSelect: (lat: string, lon: string, name: string) => void;
};

const POIS = [
  { name: "Sozialhelden Büro", lat: "52.5254", lon: "13.3670" },
  { name: "Brandenburger Tor", lat: "52.5163", lon: "13.3777" },
  { name: "München Hauptbahnhof", lat: "48.1407", lon: "11.5569" },
  { name: "Kölner Dom", lat: "50.9413", lon: "6.9581" },
  { name: "Elbphilharmonie Hamburg", lat: "53.5413", lon: "9.9842" },
  { name: "Eiffelturm Paris", lat: "48.8583", lon: "2.2945" },
  { name: "Kolosseum Rom", lat: "41.8909", lon: "12.4919" },
  { name: "Big Ben London", lat: "51.5007", lon: "-0.1246" },
  { name: "Freiheitsstatue New York", lat: "40.6893", lon: "-74.0445" },
];

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

const WORLD_CITIES = [
  { name: "Moskau", lat: "55.7539", lon: "37.6208" },
  { name: "New York", lat: "40.7128", lon: "-74.0060" },
  { name: "Tallinn", lat: "59.4370", lon: "24.7536" },
  { name: "Tokio", lat: "35.6812", lon: "139.7671" },
];

type TabColors = { active: string; inactive: string; line: string };

type PlaceGroup = {
  label: string;
  places: Place[];
  colors: TabColors;
  removable?: boolean;
};

// Verwandte Blautöne, passend zum Blau der Buttons. Klassen vollständig
// ausgeschrieben, damit Tailwind sie beim Scannen findet.
// Weiße Schrift auf den 700er-Tönen und schwarze auf den 300er-Tönen (Dark
// Mode) erreichen jeweils mindestens 4,5:1 Kontrast.
const PLACE_GROUPS: PlaceGroup[] = [
  {
    label: "Sehenswürdigkeiten",
    places: POIS,
    colors: {
      active: "bg-sky-700 text-white dark:bg-sky-300 dark:text-black",
      inactive:
        "bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900",
      line: "border-sky-700 dark:border-sky-300",
    },
  },
  {
    label: "Landeshauptstädte",
    places: CAPITALS,
    colors: {
      active: "bg-blue-700 text-white dark:bg-blue-300 dark:text-black",
      inactive:
        "bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900",
      line: "border-blue-700 dark:border-blue-300",
    },
  },
  {
    label: "Weitere Städte",
    places: WORLD_CITIES,
    colors: {
      active: "bg-indigo-700 text-white dark:bg-indigo-300 dark:text-black",
      inactive:
        "bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900",
      line: "border-indigo-700 dark:border-indigo-300",
    },
  },
];

const SAVED_COLORS: TabColors = {
  active: "bg-slate-700 text-white dark:bg-slate-300 dark:text-black",
  inactive:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  line: "border-slate-700 dark:border-slate-300",
};

export const SAVED_INDEX = PLACE_GROUPS.length;

// Reiter, der den Ort mit diesen Koordinaten enthält; sonst der erste.
export function initialGroupIndex(lat: string, lon: string) {
  return Math.max(
    PLACE_GROUPS.findIndex((group) =>
      group.places.some((place) => place.lat === lat && place.lon === lon),
    ),
    0,
  );
}

const PLACE_BUTTON =
  "min-h-12 border-2 px-4 py-2 text-left text-lg transition-colors";
const PLACE_ACTIVE =
  "border-blue-800 bg-blue-800 font-semibold text-white dark:border-blue-300 dark:bg-blue-300 dark:text-black";
const PLACE_INACTIVE =
  "border-zinc-500 text-black hover:bg-black/[.06] dark:border-zinc-400 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]";

// Reiter nach dem ARIA-Tabs-Muster: Nur der aktive Reiter ist per Tab erreichbar,
// Pfeiltasten, Pos1 und Ende wechseln zwischen ihnen.
export default function PlacePicker({
  lat,
  lon,
  groupIndex,
  onGroupChange: setGroupIndex,
  onSelect,
}: Props) {
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const saved = useSavedPlaces();
  const [announcement, setAnnouncement] = useState("");
  const groups: PlaceGroup[] = [
    ...PLACE_GROUPS,
    {
      label: "Gespeichert",
      places: saved,
      colors: SAVED_COLORS,
      removable: true,
    },
  ];
  const group = groups[groupIndex];

  // Aktiven Reiter in der scrollbaren Leiste sichtbar machen. scrollIntoView
  // würde auch die Seite verschieben, darum nur die Leiste selbst scrollen.
  useEffect(() => {
    const tab = tabRefs.current[groupIndex];
    const list = tab?.parentElement;
    if (!tab || !list) return;
    if (tab.offsetLeft < list.scrollLeft) {
      list.scrollLeft = tab.offsetLeft;
    } else if (
      tab.offsetLeft + tab.offsetWidth >
      list.scrollLeft + list.clientWidth
    ) {
      list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth;
    }
  }, [groupIndex]);

  function focusTab(index: number) {
    const next = (index + groups.length) % groups.length;
    setGroupIndex(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowRight: groupIndex + 1,
      ArrowLeft: groupIndex - 1,
      Home: 0,
      End: groups.length - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    focusTab(keys[e.key]);
  }

  function remove(place: Place) {
    removePlace(place);
    setAnnouncement(`„${place.name}“ entfernt.`);
    // Der Button verschwindet mit dem Eintrag; Fokus auf den Reiter setzen,
    // damit er nicht ins Leere fällt.
    tabRefs.current[SAVED_INDEX]?.focus();
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-lg border-2 border-zinc-400 p-4 dark:border-zinc-600"
    >
      <h2
        id={`${id}-heading`}
        className="text-xl font-semibold text-black dark:text-zinc-50"
      >
        Beispielorte
      </h2>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div
        role="tablist"
        aria-labelledby={`${id}-heading`}
        onKeyDown={onKeyDown}
        // Auf schmalen Bildschirmen seitlich scrollen statt umbrechen.
        className={`relative mt-3 flex gap-x-1 overflow-x-auto border-b-4 ${group.colors.line}`}
      >
        {groups.map((g, index) => {
          const selected = index === groupIndex;
          return (
            <button
              key={g.label}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${id}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setGroupIndex(index)}
              className={`min-h-12 shrink-0 whitespace-nowrap rounded-t-lg px-4 py-2 text-lg ${
                selected
                  ? `font-semibold ${g.colors.active}`
                  : g.colors.inactive
              }`}
            >
              {g.label}{" "}
              <span className="ml-1 text-base font-normal opacity-80">
                {g.places.length}
              </span>
            </button>
          );
        })}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${groupIndex}`}
        className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
      >
        {group.removable && group.places.length === 0 && (
          <p className="col-span-full text-lg text-zinc-700 dark:text-zinc-300">
            Noch keine Orte gespeichert. Ort suchen oder auswählen und dann „Ort
            speichern“ neben der Suche drücken. Die Orte bleiben in diesem
            Browser auch nach dem Neuladen erhalten.
          </p>
        )}
        {group.places.map((place) => {
          const active = place.lat === lat && place.lon === lon;
          const select = () => onSelect(place.lat, place.lon, place.name);
          if (!group.removable) {
            return (
              <button
                key={place.name}
                type="button"
                aria-pressed={active}
                onClick={select}
                className={`${PLACE_BUTTON} rounded-lg ${active ? PLACE_ACTIVE : PLACE_INACTIVE}`}
              >
                {place.name}
              </button>
            );
          }
          return (
            <div key={`${place.lat},${place.lon}`} className="flex">
              <button
                type="button"
                aria-pressed={active}
                onClick={select}
                className={`${PLACE_BUTTON} min-w-0 flex-1 break-words rounded-l-lg ${active ? PLACE_ACTIVE : PLACE_INACTIVE}`}
              >
                {place.name}
              </button>
              <button
                type="button"
                onClick={() => remove(place)}
                aria-label={`„${place.name}“ entfernen`}
                className={`${PLACE_BUTTON} -ml-0.5 shrink-0 rounded-r-lg px-3 ${PLACE_INACTIVE}`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  className="h-5 w-5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
