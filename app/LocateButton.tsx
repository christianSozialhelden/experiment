"use client";

import { useState } from "react";

type Props = {
  onLocate: (lat: number, lon: number) => void;
};

// Übernimmt den Standort des Geräts, damit niemand Koordinaten tippen muss.
// Der Browser fragt dabei selbst um Erlaubnis.
export default function LocateButton({ onLocate }: Props) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [message, setMessage] = useState("");

  function locate() {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Dieser Browser kann den Standort nicht ermitteln.");
      return;
    }
    setStatus("locating");
    setMessage("Standort wird ermittelt …");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("idle");
        setMessage("Standort übernommen.");
        onLocate(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        setStatus("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Zugriff auf den Standort wurde nicht erlaubt."
            : "Standort konnte nicht ermittelt werden.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={locate}
        disabled={status === "locating"}
        className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 border-blue-800 px-4 py-3 text-lg font-medium text-blue-800 hover:bg-blue-50 disabled:cursor-default disabled:border-zinc-400 disabled:text-zinc-600 disabled:hover:bg-transparent dark:border-blue-300 dark:text-blue-300 dark:hover:bg-blue-950 dark:disabled:border-zinc-600 dark:disabled:text-zinc-400"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 shrink-0 ${status === "locating" ? "motion-safe:animate-pulse" : ""}`}
        >
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        Mein Standort
      </button>
      <p
        aria-live="polite"
        className={
          status === "error"
            ? "text-base text-red-700 dark:text-red-300"
            : "sr-only"
        }
      >
        {message}
      </p>
    </div>
  );
}
