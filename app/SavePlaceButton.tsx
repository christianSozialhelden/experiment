"use client";

import { useState } from "react";
import { savePlace, useSavedPlaces } from "./savedPlaces";

type Props = {
  lat: string;
  lon: string;
  // Name des aktuellen Orts, null nach Eingabe von Koordinaten oder Ziehen der
  // Nadel.
  name: string | null;
  enabled: boolean;
  onSaved: () => void;
};

export default function SavePlaceButton({
  lat,
  lon,
  name,
  enabled,
  onSaved,
}: Props) {
  const saved = useSavedPlaces();
  const [announcement, setAnnouncement] = useState("");
  const isSaved = saved.some((place) => place.lat === lat && place.lon === lon);

  function save() {
    const placeName = name ?? `Ort bei ${lat}, ${lon}`;
    savePlace({ name: placeName, lat, lon });
    setAnnouncement(`„${placeName}“ gespeichert.`);
    onSaved();
  }

  return (
    <>
      <button
        type="button"
        onClick={save}
        disabled={!enabled || isSaved}
        // Gleiche Höhe wie die Eingabefelder daneben (py-3, 1,75rem Zeilenhöhe).
        className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 border-blue-800 px-4 py-3 text-lg font-medium text-blue-800 hover:bg-blue-50 disabled:cursor-default disabled:border-zinc-400 disabled:text-zinc-600 disabled:hover:bg-transparent dark:border-blue-300 dark:text-blue-300 dark:hover:bg-blue-950 dark:disabled:border-zinc-600 dark:disabled:text-zinc-400"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill={isSaved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0"
        >
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
        </svg>
        {isSaved ? "Gespeichert" : "Ort speichern"}
      </button>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
