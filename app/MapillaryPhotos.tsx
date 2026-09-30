"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Photo = {
  id: string;
  thumbUrl: string;
  shotDate: string;
  distance: number;
  author: string;
  is360: boolean;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type RawImage = {
  id: string;
  captured_at?: number;
  is_pano?: boolean;
  sequence?: string;
  geometry: { coordinates: [number, number] };
};

type RawDetails = {
  thumb_1024_url?: string;
  creator?: { username?: string };
};

type Candidate = Omit<Photo, "thumbUrl" | "author">;

// Client-Token (MLY|…) ist für den Einsatz im Browser gedacht und wird beim
// Build in das JavaScript eingesetzt. Ohne Token bleibt nur der Weblink.
const TOKEN = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

// Bounding-Box mit halber Kantenlänge `meters` um den Punkt.
function bbox(lat: number, lon: number, meters: number) {
  const dLat = meters / 111320;
  const dLon = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat]
    .map((n) => n.toFixed(6))
    .join(",");
}

class GraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function fetchGraph(
  path: string,
  params: Record<string, string>,
  signal: AbortSignal,
) {
  const query = new URLSearchParams({ access_token: TOKEN!, ...params });
  const res = await fetch(`https://graph.mapillary.com/${path}?${query}`, {
    signal,
  });
  const data = await res.json().catch(() => ({}));
  // Die Graph API liefert Fehler als { error: { message, code } }.
  if (!res.ok || data.error) {
    throw new GraphError(
      data.error?.message
        ? `${data.error.message} (HTTP ${res.status})`
        : `HTTP ${res.status}`,
      res.status,
    );
  }
  return data;
}

// Bildsuche in der Bounding-Box. Die API durchsucht serverseitig alle Fotos in
// der Box; in dichten Gegenden (Berlin-Mitte) bricht sie schon bei 200 m
// Kantenlänge mit HTTP 500 ab ("Please reduce the amount of data you're asking
// for"), unabhängig von `limit` und `fields`. Deshalb klein anfangen, bei 500
// die Box halbieren und nur bei leerem Ergebnis vergrößern.
async function searchImages(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<RawImage[]> {
  let radius = 50;
  let shrunk = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const data = await fetchGraph(
        "images",
        {
          fields: "id,captured_at,is_pano,sequence,geometry",
          bbox: bbox(lat, lon, radius),
          limit: "100",
        },
        signal,
      );
      const images: RawImage[] = data.data ?? [];
      if (images.length > 0 || shrunk || radius >= 800) return images;
      radius *= 4;
    } catch (error) {
      if (!(error instanceof GraphError && error.status === 500) || radius <= 12)
        throw error;
      radius /= 2;
      shrunk = true;
    }
  }
  return [];
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

export default function MapillaryPhotos({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    photos: Photo[] | null;
    error?: string;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;
  const [selection, setSelection] = useState<{ key: string; id: string } | null>(
    null,
  );
  const selectedId =
    (selection?.key === coordKey ? selection.id : null) ??
    current?.photos?.[0]?.id ??
    null;

  useEffect(() => {
    if (!enabled || !TOKEN) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const images = await searchImages(lat, lon, controller.signal);

        // Aufeinanderfolgende Fotos einer Sequenz sehen fast gleich aus,
        // deshalb nur das nächstgelegene je Sequenz.
        const nearestPerSequence = new Map<string, Candidate>();
        for (const image of images) {
          const [imageLon, imageLat] = image.geometry.coordinates;
          const distance = distanceInMeters(lat, lon, imageLat, imageLon);
          const sequence = image.sequence ?? image.id;
          const known = nearestPerSequence.get(sequence);
          if (known && known.distance <= distance) continue;
          nearestPerSequence.set(sequence, {
            id: image.id,
            shotDate: image.captured_at ? formatDate(image.captured_at) : "",
            distance,
            is360: image.is_pano === true,
          });
        }
        const candidates = [...nearestPerSequence.values()]
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 6);

        // Vorschau und Urheber nur für die angezeigten Fotos, je Foto ein Aufruf.
        const details = await Promise.allSettled(
          candidates.map(
            (c) =>
              fetchGraph(
                c.id,
                { fields: "thumb_1024_url,creator" },
                controller.signal,
              ) as Promise<RawDetails>,
          ),
        );
        const photos: Photo[] = [];
        details.forEach((d, i) => {
          if (d.status !== "fulfilled" || !d.value.thumb_1024_url) return;
          photos.push({
            ...candidates[i],
            thumbUrl: d.value.thumb_1024_url,
            author: d.value.creator?.username ?? "",
          });
        });
        const failure = details.find((d) => d.status === "rejected");
        if (photos.length === 0 && failure) throw failure.reason;

        setResult({ key: coordKey, photos });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: coordKey,
          photos: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, lat, lon, coordKey]);

  if (!enabled) return null;

  const webUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`;

  if (!TOKEN) {
    return (
      <section className="rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-100 p-4 text-lg dark:border-zinc-600 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
            Mapillary
          </h2>
          <span className="rounded border border-zinc-500 px-2 py-0.5 text-sm font-medium text-zinc-700 dark:border-zinc-400 dark:text-zinc-300">
            Nicht verfügbar
          </span>
        </div>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          360°-Straßenfotos an diesem Punkt.
        </p>
        <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
          Kein Zugriffstoken hinterlegt.
        </p>
        <a
          href={webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-12 items-center gap-2 text-base font-medium text-zinc-700 underline decoration-2 underline-offset-4 dark:text-zinc-300"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
          Website öffnen
        </a>
      </section>
    );
  }

  const selected = current?.photos?.find((p) => p.id === selectedId);

  return (
    <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg md:col-span-2 lg:col-span-3 dark:border-zinc-600">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Straßenfotos von Mapillary
      </h2>
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.photos === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Fotos konnten nicht geladen werden.
          {current.error && (
            <span className="mt-1 block text-base text-zinc-600 dark:text-zinc-400">
              Mapillary meldet: {current.error}
            </span>
          )}
        </p>
      ) : current.photos.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Keine Straßenfotos in der Nähe gefunden.
        </p>
      ) : (
        <>
          {selected && (
            <>
              <iframe
                key={selected.id}
                src={`https://www.mapillary.com/embed?image_key=${selected.id}&style=photo`}
                title={`Mapillary-Viewer: ${selected.is360 ? "360°-Foto" : "Straßenfoto"}, ${Math.round(selected.distance)} m entfernt`}
                loading="lazy"
                allowFullScreen
                className="mt-3 h-96 w-full rounded-lg border-2 border-zinc-400 dark:border-zinc-600"
              />
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {Math.round(selected.distance)} m entfernt
                {selected.is360 && " · 360°"}
                {selected.shotDate && ` · Aufgenommen ${selected.shotDate}`}
                {selected.author && ` · ${selected.author}`} · CC BY-SA 4.0
              </p>
            </>
          )}
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {current.photos.map((photo) => {
              const active = photo.id === selectedId;
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelection({ key: coordKey, id: photo.id })}
                    className="block w-full text-left"
                  >
                    <Image
                      src={photo.thumbUrl}
                      alt={`${photo.is360 ? "360°-Foto" : "Straßenfoto"}, ${Math.round(photo.distance)} m entfernt`}
                      width={1024}
                      height={768}
                      className={`h-24 w-full rounded object-cover ${
                        active
                          ? "border-4 border-blue-800 dark:border-blue-300"
                          : "border-2 border-zinc-400 dark:border-zinc-600"
                      }`}
                      unoptimized
                    />
                    <span className="mt-1 block text-base text-blue-800 underline dark:text-blue-300">
                      {Math.round(photo.distance)} m
                      {photo.is360 && " · 360°"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        Quelle:{" "}
        <a
          href={webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Mapillary
        </a>
      </p>
    </div>
  );
}
