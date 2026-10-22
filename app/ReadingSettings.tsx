"use client";

import { useEffect, useSyncExternalStore } from "react";

// Grundgröße aus globals.css (html { font-size: 84% }); alle Maße hängen über rem daran.
const BASE_PERCENT = 84;
const SIZES = [
  { factor: 1, label: "normal" },
  { factor: 1.25, label: "groß" },
  { factor: 1.5, label: "sehr groß" },
];

// Ohne localStorage (privates Fenster, gesperrter Speicher) gilt die Einstellung bis zum
// Neuladen.
const memory = new Map<string, string>();

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// Einstellungen leben in localStorage; useSyncExternalStore liest sie beim Rendern,
// beim statischen Vorrendern gilt der Standardwert.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useSetting(key: string, fallback: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
}

function save(key: string, value: string) {
  write(key, value);
  listeners.forEach((listener) => listener());
}

function applySize(index: number) {
  document.documentElement.style.fontSize =
    index === 0 ? "" : `${BASE_PERCENT * SIZES[index].factor}%`;
}

function applyContrast(on: boolean) {
  document.documentElement.classList.toggle("high-contrast", on);
}

const BUTTON =
  "flex h-14 min-w-14 items-center justify-center rounded-full border-2 border-zinc-500 px-3 text-black transition-colors hover:bg-black/[.06] aria-pressed:bg-black aria-pressed:text-white dark:border-zinc-400 dark:text-zinc-50 dark:hover:bg-[#1a1a1a] dark:aria-pressed:bg-zinc-50 dark:aria-pressed:text-black";

export default function ReadingSettings() {
  const stored = Number(useSetting("fontSize", "0"));
  const size = SIZES[stored] ? stored : 0;
  const contrast = useSetting("contrast", "normal") === "high";

  useEffect(() => applySize(size), [size]);
  useEffect(() => applyContrast(contrast), [contrast]);

  const nextSize = () => save("fontSize", String((size + 1) % SIZES.length));
  const toggleContrast = () => save("contrast", contrast ? "normal" : "high");

  return (
    <>
      <button
        type="button"
        onClick={nextSize}
        aria-label={`Schriftgröße: ${SIZES[size].label}. Klicken für ${SIZES[(size + 1) % SIZES.length].label}`}
        className={BUTTON}
      >
        <span aria-hidden="true" className="text-xl font-semibold">
          A{"+".repeat(size)}
        </span>
      </button>
      <button
        type="button"
        onClick={toggleContrast}
        aria-pressed={contrast}
        aria-label="Hoher Kontrast"
        className={BUTTON}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-7 w-7"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
        </svg>
      </button>
    </>
  );
}
