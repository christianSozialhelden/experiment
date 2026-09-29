"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Photo = {
  id: string;
  thumbUrl: string;
  detailsUrl: string;
  shotDate: string;
  distance: number;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type RawPhoto = {
  id: string;
  fileurlLTh: string;
  sequenceIndex: string;
  shotDate: string | null;
  distance: string | null;
  sequence: { id: string };
};

function formatDate(shotDate: string) {
  const date = new Date(shotDate.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export default function KartaViewPhotos({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    photos: Photo[] | null;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // Die Umkreissuche mit `radius` läuft serverseitig in einen Timeout,
        // `zoomLevel` liefert dagegen das nächste Foto je Sequenz (ca. 200 m).
        // Ohne `orderBy`/`orderDirection` läuft auch diese Abfrage in den Timeout.
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lon),
          zoomLevel: "18",
          join: "sequence",
          orderBy: "id",
          orderDirection: "desc",
          itemsPerPage: "50",
        });
        const res = await fetch(
          `https://api.openstreetcam.org/2.0/photo/?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw: RawPhoto[] = data.result?.data ?? [];

        setResult({
          key: coordKey,
          photos: raw
            .filter((p) => p.fileurlLTh)
            .map((p) => ({
              id: p.id,
              thumbUrl: p.fileurlLTh,
              detailsUrl: `https://kartaview.org/details/${p.sequence.id}/${p.sequenceIndex}`,
              shotDate: p.shotDate ? formatDate(p.shotDate) : "",
              distance: Number(p.distance ?? 0),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 6),
        });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key: coordKey, photos: null });
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
        Straßenfotos von KartaView
      </h2>
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.photos === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Fotos konnten nicht geladen werden.
        </p>
      ) : current.photos.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Keine Straßenfotos in der Nähe gefunden.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-4">
          {current.photos.map((photo) => (
            <li key={photo.id}>
              <a href={photo.detailsUrl} target="_blank" rel="noopener noreferrer">
                <Image
                  src={photo.thumbUrl}
                  alt={`Straßenfoto, ${Math.round(photo.distance)} m entfernt`}
                  width={400}
                  height={225}
                  className="h-32 w-full rounded border-2 border-zinc-400 object-cover dark:border-zinc-600"
                  unoptimized
                />
                <span className="mt-1 block text-base text-blue-800 underline dark:text-blue-300">
                  {Math.round(photo.distance)} m entfernt
                </span>
              </a>
              {photo.shotDate && (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Aufgenommen {photo.shotDate}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        Quelle:{" "}
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
      </p>
    </div>
  );
}
