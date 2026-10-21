import { useSyncExternalStore } from "react";

export type SavedPlace = { name: string; lat: string; lon: string };

// Gespeicherte Orte liegen nur im Browser (localStorage), nicht auf einem
// Server: Die Seite ist ein statischer Export ohne Backend.
const KEY = "geokoordinaten-experiment:gespeicherte-orte";
const MAX_PLACES = 50;
const EMPTY: SavedPlace[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: SavedPlace[] = EMPTY;
// Ersatz, wenn localStorage nicht beschreibbar ist (z. B. privates Fenster in
// manchen Browsern): Die Liste gilt dann bis zum Neuladen.
let memoryOnly: SavedPlace[] | null = null;

function isSavedPlace(value: unknown): value is SavedPlace {
  const v = value as SavedPlace;
  return (
    typeof v?.name === "string" &&
    typeof v.lat === "string" &&
    typeof v.lon === "string"
  );
}

// useSyncExternalStore verlangt bei unverändertem Inhalt dieselbe Referenz,
// darum wird nur neu geparst, wenn sich der gespeicherte Text ändert.
function getSnapshot(): SavedPlace[] {
  if (memoryOnly) return memoryOnly;
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cached;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    cached = Array.isArray(parsed) ? parsed.filter(isSavedPlace) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Änderungen aus anderen Tabs derselben Seite.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(places: SavedPlace[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(places));
  } catch {
    memoryOnly = places;
  }
  listeners.forEach((listener) => listener());
}

export function useSavedPlaces(): SavedPlace[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function savePlace(place: SavedPlace) {
  const others = getSnapshot().filter(
    (p) => p.lat !== place.lat || p.lon !== place.lon,
  );
  write([place, ...others].slice(0, MAX_PLACES));
}

export function removePlace(place: SavedPlace) {
  write(
    getSnapshot().filter((p) => p.lat !== place.lat || p.lon !== place.lon),
  );
}
