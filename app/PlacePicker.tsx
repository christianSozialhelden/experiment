"use client";

import { useEffect, useId, useRef, useState } from "react";

type Place = { name: string; lat: string; lon: string };

type Props = {
  lat: string;
  lon: string;
  onSelect: (lat: string, lon: string) => void;
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

const PLACE_GROUPS: { label: string; places: Place[] }[] = [
  { label: "Sehenswürdigkeiten", places: POIS },
  { label: "Landeshauptstädte", places: CAPITALS },
  { label: "Weitere Städte", places: WORLD_CITIES },
];

// Reiter nach dem ARIA-Tabs-Muster: Nur der aktive Reiter ist per Tab erreichbar,
// Pfeiltasten, Pos1 und Ende wechseln zwischen ihnen.
export default function PlacePicker({ lat, lon, onSelect }: Props) {
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [groupIndex, setGroupIndex] = useState(() =>
    Math.max(
      PLACE_GROUPS.findIndex((group) =>
        group.places.some((place) => place.lat === lat && place.lon === lon),
      ),
      0,
    ),
  );
  const group = PLACE_GROUPS[groupIndex];

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
    const next = (index + PLACE_GROUPS.length) % PLACE_GROUPS.length;
    setGroupIndex(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowRight: groupIndex + 1,
      ArrowLeft: groupIndex - 1,
      Home: 0,
      End: PLACE_GROUPS.length - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    focusTab(keys[e.key]);
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
      <div
        role="tablist"
        aria-labelledby={`${id}-heading`}
        onKeyDown={onKeyDown}
        // Auf schmalen Bildschirmen seitlich scrollen statt umbrechen.
        className="relative mt-3 flex gap-x-2 overflow-x-auto border-b-2 border-zinc-400 dark:border-zinc-600"
      >
        {PLACE_GROUPS.map((g, index) => {
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
              className={`-mb-0.5 min-h-12 shrink-0 whitespace-nowrap border-b-4 px-3 py-2 text-lg ${
                selected
                  ? "border-blue-800 font-semibold text-blue-800 dark:border-blue-300 dark:text-blue-300"
                  : "border-transparent text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50"
              }`}
            >
              {g.label}{" "}
              <span className="ml-1 text-base font-normal text-zinc-600 dark:text-zinc-400">
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
        {group.places.map((place) => {
          const active = place.lat === lat && place.lon === lon;
          return (
            <button
              key={place.name}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(place.lat, place.lon)}
              className={`min-h-12 rounded-lg border-2 px-4 py-2 text-left text-lg transition-colors ${
                active
                  ? "border-blue-800 bg-blue-800 font-semibold text-white dark:border-blue-300 dark:bg-blue-300 dark:text-black"
                  : "border-zinc-500 text-black hover:bg-black/[.06] dark:border-zinc-400 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
              }`}
            >
              {place.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
