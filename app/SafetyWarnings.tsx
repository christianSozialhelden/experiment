"use client";

import { useEffect, useState } from "react";

type Warning = {
  id: string;
  headline: string;
  severity: string;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

const SEVERITY_LABELS: Record<string, string> = {
  Extreme: "Extreme Gefahr",
  Severe: "Große Gefahr",
  Moderate: "Mittlere Gefahr",
  Minor: "Geringe Gefahr",
};

const SEVERITY_STYLES: Record<string, string> = {
  Extreme: "border-red-700 text-red-800 dark:border-red-400 dark:text-red-300",
  Severe: "border-red-700 text-red-800 dark:border-red-400 dark:text-red-300",
  Moderate:
    "border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-300",
  Minor:
    "border-zinc-500 text-zinc-800 dark:border-zinc-400 dark:text-zinc-200",
};

export default function SafetyWarnings({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    warnings: Warning[] | null;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/warnings?lat=${lat}&lon=${lon}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult({ key: coordKey, warnings: data.warnings ?? [] });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key: coordKey, warnings: null });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, lat, lon, coordKey]);

  if (!enabled) return null;

  return (
    <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Amtliche Warnungen
      </h2>
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.warnings === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Warnungen konnten nicht geladen werden.
        </p>
      ) : current.warnings.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 shrink-0"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Derzeit keine Warnungen für diesen Landkreis.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {current.warnings.map((warning) => (
            <li
              key={warning.id}
              className={`border-l-4 pl-3 ${
                SEVERITY_STYLES[warning.severity] ?? SEVERITY_STYLES.Minor
              }`}
            >
              <p className="font-semibold">
                {SEVERITY_LABELS[warning.severity] ?? "Warnung"}
              </p>
              <p className="text-zinc-800 dark:text-zinc-200">
                {warning.headline}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        Quelle:{" "}
        <a
          href="https://warnung.bund.de"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-800 underline dark:text-blue-300"
        >
          NINA, Bundesamt für Bevölkerungsschutz
        </a>
      </p>
    </div>
  );
}
