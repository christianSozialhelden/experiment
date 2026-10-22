"use client";

import Image from "next/image";
import { useState } from "react";
import { fetchKartaViewPhotos } from "./kartaViewPhotos";
import { fetchMapillaryPhotos, MAPILLARY_AVAILABLE } from "./mapillaryPhotos";
import { fetchPanoramaxPhotos } from "./panoramaxPhotos";
import { fetchWikipediaPhotos } from "./wikipediaPhotos";
import {
  usePhotoSearch,
  type PhotoState,
  type StreetPhoto,
} from "./photoSearch";

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

const describe = (photo: StreetPhoto) =>
  `${photo.title ?? (photo.is360 ? "360°-Foto" : "Straßenfoto")}, ${Math.round(photo.distance)} m entfernt`;

// Drehender Kreis neben dem Ladehinweis. Bei „Bewegung reduzieren“ steht er still;
// der Text daneben trägt die Information ohnehin.
function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6 shrink-0 text-blue-800 motion-safe:animate-spin dark:text-blue-300"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth={3}
        opacity={0.25}
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Fehlerhinweis für die Quellenliste: Fällt ein Dienst aus, zeigen die anderen weiter Fotos.
function problem(state: PhotoState) {
  return state.status === "error"
    ? ` – Fotos konnten nicht geladen werden (${state.error})`
    : "";
}

export default function StreetPhotos({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const panoramax = usePhotoSearch(lat, lon, enabled, fetchPanoramaxPhotos);
  const mapillary = usePhotoSearch(
    lat,
    lon,
    enabled && MAPILLARY_AVAILABLE,
    fetchMapillaryPhotos,
  );
  const kartaView = usePhotoSearch(lat, lon, enabled, fetchKartaViewPhotos);
  const wikipedia = usePhotoSearch(lat, lon, enabled, fetchWikipediaPhotos);
  const [selection, setSelection] = useState<{
    key: string;
    id: string;
  } | null>(null);

  if (!enabled) return null;

  const states = MAPILLARY_AVAILABLE
    ? [panoramax, mapillary, kartaView, wikipedia]
    : [panoramax, kartaView, wikipedia];
  const loading = states.some((s) => s.status === "loading");
  const photos = states
    .flatMap((s) => (s.status === "done" ? s.photos : []))
    .sort((a, b) => a.distance - b.distance);
  const selected =
    photos.find((p) => selection?.key === coordKey && p.id === selection.id) ??
    photos[0];

  return (
    <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg dark:border-zinc-600">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Straßenfotos
      </h2>
      {photos.length === 0 && loading ? (
        <p
          role="status"
          className="mt-2 flex items-center gap-3 text-zinc-700 dark:text-zinc-300"
        >
          <Spinner />
          Lädt …
        </p>
      ) : photos.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          {states.every((s) => s.status === "error")
            ? "Fotos konnten nicht geladen werden."
            : "Keine Straßenfotos in der Nähe gefunden."}
        </p>
      ) : (
        <>
          {selected && (
            <figure className="mt-3">
              {selected.embedUrl ? (
                <iframe
                  key={selected.id}
                  src={selected.embedUrl}
                  title={`Viewer: ${describe(selected)}`}
                  loading="lazy"
                  allowFullScreen
                  className="h-96 w-full rounded-lg border-2 border-zinc-400 dark:border-zinc-600"
                />
              ) : (
                <a
                  href={selected.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    key={selected.id}
                    src={selected.largeUrl}
                    alt={describe(selected)}
                    width={1024}
                    height={768}
                    className="h-96 w-full rounded-lg border-2 border-zinc-400 bg-zinc-100 object-contain dark:border-zinc-600 dark:bg-zinc-900"
                    unoptimized
                  />
                </a>
              )}
              <figcaption className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {selected.title && `${selected.title} · `}
                {Math.round(selected.distance)} m entfernt
                {selected.is360 && " · 360°"}
                {selected.shotDate && ` · Aufgenommen ${selected.shotDate}`}
                {selected.author && ` · ${selected.author}`}
                {selected.license && ` · ${selected.license}`} ·{" "}
                <a
                  href={selected.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Im Original öffnen
                </a>
              </figcaption>
            </figure>
          )}
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {photos.map((photo) => {
              const active = photo.id === selected?.id;
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelection({ key: coordKey, id: photo.id })
                    }
                    className="block w-full text-left"
                  >
                    <Image
                      src={photo.thumbUrl}
                      alt={describe(photo)}
                      width={400}
                      height={300}
                      className={`h-24 w-full rounded object-cover ${
                        active
                          ? "border-4 border-blue-800 dark:border-blue-300"
                          : "border-2 border-zinc-400 dark:border-zinc-600"
                      }`}
                      unoptimized
                    />
                    <span className="mt-1 block text-base text-blue-800 underline dark:text-blue-300">
                      {Math.round(photo.distance)} m{photo.is360 && " · 360°"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {loading && (
            <p
              role="status"
              className="mt-2 flex items-center gap-3 text-base text-zinc-700 dark:text-zinc-300"
            >
              <Spinner />
              Weitere Fotos werden geladen …
            </p>
          )}
        </>
      )}
      {/* Die Lizenzen (CC BY-SA) verlangen die Nennung der Quelle; sie steht hier statt in
          den Überschriften, aufgeklappt per Klick. */}
      <details className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        <summary className="cursor-pointer py-2">Quellen und Lizenzen</summary>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <a
              href="https://de.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Wikipedia
            </a>{" "}
            und{" "}
            <a
              href="https://commons.wikimedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Wikimedia Commons
            </a>
            , Urheber und Lizenz je Foto{problem(wikipedia)}
          </li>
          <li>
            <a
              href="https://panoramax.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Panoramax
            </a>
            , Urheber und Lizenz je Foto{problem(panoramax)}
          </li>
          <li>
            <a
              href={`https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Mapillary
            </a>
            -Mitwirkende, Lizenz CC BY-SA 4.0
            {MAPILLARY_AVAILABLE
              ? problem(mapillary)
              : " – nicht verfügbar, kein Zugriffstoken hinterlegt"}
          </li>
          <li>
            <a
              href={`https://kartaview.org/map/@${lat},${lon},17z`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              KartaView
            </a>
            -Mitwirkende, Lizenz{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.de"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              CC BY-SA 4.0
            </a>
            {problem(kartaView)}
          </li>
        </ul>
      </details>
    </div>
  );
}
