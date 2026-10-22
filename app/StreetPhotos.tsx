"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
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

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

const ARROW_BUTTON =
  "absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-0";

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
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shownId = useRef<string | undefined>(undefined);

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
  const index = selected ? photos.indexOf(selected) : -1;
  const photoIds = photos.map((p) => p.id).join("|");

  // Slider: Die Fotos liegen nebeneinander in einer Scroll-Leiste mit Einrasten, so geht
  // Wischen auf Touch und Trackpad von selbst. Hier wird die Leiste auf das ausgewählte
  // Foto geschoben: gleitend, wenn jemand ein anderes Foto gewählt hat; sofort, wenn sich
  // nur die Liste geändert hat (später eintreffende Dienste schieben Fotos dazwischen).
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || index < 0) return;
    const left = index * track.clientWidth;
    const changed =
      shownId.current !== undefined && shownId.current !== selected?.id;
    shownId.current = selected?.id;
    if (Math.abs(track.scrollLeft - left) < 2) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollTo({ left, behavior: changed && !reduced ? "smooth" : "auto" });
  }, [index, photoIds, selected?.id]);

  if (!enabled) return null;

  const goTo = (i: number) => {
    const photo = photos[i];
    if (photo) setSelection({ key: coordKey, id: photo.id });
  };

  // Nach dem Wischen: das eingerastete Foto übernehmen. Erst wenn das Scrollen ruht,
  // damit ein gleitender Wechsel nicht unterwegs auf Zwischenfotos springt.
  const onScroll = () => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const i = Math.round(track.scrollLeft / track.clientWidth);
      const photo = photos[i];
      if (photo && photo.id !== selected?.id) {
        shownId.current = photo.id;
        setSelection({ key: coordKey, id: photo.id });
      }
    }, 120);
  };

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
              <div className="relative">
                <div
                  ref={trackRef}
                  tabIndex={0}
                  role="region"
                  aria-roledescription="Karussell"
                  aria-label="Straßenfotos, mit Pfeiltasten wechseln"
                  onScroll={onScroll}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") goTo(index - 1);
                    else if (e.key === "ArrowRight") goTo(index + 1);
                    else return;
                    e.preventDefault();
                  }}
                  className="flex snap-x snap-mandatory overflow-x-auto rounded-lg border-2 border-zinc-400 [scrollbar-width:none] dark:border-zinc-600"
                >
                  {photos.map((photo, i) => {
                    const active = i === index;
                    return (
                      <div
                        key={photo.id}
                        role="group"
                        aria-roledescription="Foto"
                        aria-label={`${i + 1} von ${photos.length}`}
                        // Nicht sichtbare Fotos aus der Tab-Reihenfolge nehmen.
                        inert={!active}
                        className="relative h-96 w-full shrink-0 snap-center overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                      >
                        {/* Den 360°-Viewer nur für das sichtbare Foto laden. */}
                        {active && photo.embedUrl ? (
                          <iframe
                            src={photo.embedUrl}
                            title={`Viewer: ${describe(photo)}`}
                            allowFullScreen
                            className="h-full w-full"
                          />
                        ) : (
                          <>
                            {/* Freie Fläche neben dem Foto: dasselbe Bild randfüllend und
                              weichgezeichnet. Das Vorschaubild reicht dafür und ist schon
                              geladen; scale verdeckt die hellen Blur-Ränder. */}
                            <Image
                              src={photo.thumbUrl}
                              alt=""
                              aria-hidden="true"
                              width={400}
                              height={300}
                              draggable={false}
                              loading={
                                Math.abs(i - index) <= 1 ? "eager" : "lazy"
                              }
                              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                              unoptimized
                            />
                            <a
                              href={photo.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              draggable={false}
                              className="relative block h-full"
                            >
                              <Image
                                src={photo.largeUrl}
                                alt={describe(photo)}
                                width={1024}
                                height={768}
                                draggable={false}
                                // Nachbarfotos vorladen, damit der Wechsel nicht ins Leere gleitet.
                                loading={
                                  Math.abs(i - index) <= 1 ? "eager" : "lazy"
                                }
                                className="h-full w-full object-contain"
                                unoptimized
                              />
                            </a>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Vorheriges Foto"
                  disabled={index <= 0}
                  onClick={() => goTo(index - 1)}
                  className={`${ARROW_BUTTON} left-3`}
                >
                  <Arrow direction="left" />
                </button>
                <button
                  type="button"
                  aria-label="Nächstes Foto"
                  disabled={index >= photos.length - 1}
                  onClick={() => goTo(index + 1)}
                  className={`${ARROW_BUTTON} right-3`}
                >
                  <Arrow direction="right" />
                </button>
              </div>
              <figcaption className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {index + 1} von {photos.length} ·{" "}
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
                    onClick={() => goTo(photos.indexOf(photo))}
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
                    {photo.is360 && (
                      <span className="mt-1 block text-base text-zinc-700 dark:text-zinc-300">
                        360°
                      </span>
                    )}
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
