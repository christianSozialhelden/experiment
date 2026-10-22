"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Photo = {
  id: string;
  thumbUrl: string;
  viewerUrl: string;
  shotDate: string;
  distance: number;
  author: string;
  license: string;
  is360: boolean;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type RawItem = {
  id: string;
  collection: string;
  geometry: { coordinates: [number, number] };
  assets: { thumb?: { href: string } };
  providers?: { name: string; roles: string[] }[];
  properties: {
    datetime?: string;
    license?: string;
    "pers:interior_orientation"?: { field_of_view?: number };
  };
};

const LICENSE_NAMES: Record<string, string> = {
  "CC-BY-SA-4.0": "CC BY-SA 4.0",
  "CC-BY-4.0": "CC BY 4.0",
  "CC0-1.0": "CC0",
  "etalab-2.0": "Licence Ouverte 2.0",
};

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function formatDate(datetime: string) {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export default function PanoramaxPhotos({ lat, lon, enabled }: Props) {
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
        let items: RawItem[] = [];
        for (const radius of [200, 1000]) {
          // Der Metakatalog durchsucht alle föderierten Panoramax-Instanzen.
          // `place_position` erwartet Länge vor Breite.
          const params = new URLSearchParams({
            place_position: `${lon},${lat}`,
            place_distance: `0-${radius}`,
            limit: "100",
          });
          const res = await fetch(
            `https://api.panoramax.xyz/api/search?${params}`,
            { signal: controller.signal },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          items = (data.features ?? []).filter((i: RawItem) => i.assets.thumb);
          if (items.length > 0) break;
        }

        // Aufeinanderfolgende Fotos einer Sequenz sehen fast gleich aus,
        // deshalb nur das nächstgelegene je Sequenz.
        const nearestPerSequence = new Map<string, Photo>();
        for (const item of items) {
          const [itemLon, itemLat] = item.geometry.coordinates;
          const distance = distanceInMeters(lat, lon, itemLat, itemLon);
          const known = nearestPerSequence.get(item.collection);
          if (known && known.distance <= distance) continue;
          const license = item.properties.license ?? "";
          nearestPerSequence.set(item.collection, {
            id: item.id,
            thumbUrl: item.assets.thumb!.href,
            viewerUrl: `https://api.panoramax.xyz/#focus=pic&pic=${item.id}`,
            shotDate: item.properties.datetime
              ? formatDate(item.properties.datetime)
              : "",
            distance,
            author:
              item.providers?.find((p) => p.roles.includes("producer"))?.name ??
              "",
            license: LICENSE_NAMES[license] ?? license,
            is360:
              item.properties["pers:interior_orientation"]?.field_of_view ===
              360,
          });
        }

        setResult({
          key: coordKey,
          photos: [...nearestPerSequence.values()]
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
        Straßenfotos von Panoramax
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
              <a href={photo.viewerUrl} target="_blank" rel="noopener noreferrer">
                <Image
                  src={photo.thumbUrl}
                  alt={`${photo.is360 ? "360°-Foto" : "Straßenfoto"}, ${Math.round(photo.distance)} m entfernt`}
                  width={500}
                  height={375}
                  className="h-32 w-full rounded border-2 border-zinc-400 object-cover dark:border-zinc-600"
                  unoptimized
                />
                <span className="mt-1 block text-base text-blue-800 underline dark:text-blue-300">
                  {Math.round(photo.distance)} m entfernt
                  {photo.is360 && " · 360°"}
                </span>
              </a>
              {photo.shotDate && (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Aufgenommen {photo.shotDate}
                </p>
              )}
              {(photo.author || photo.license) && (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {photo.author}
                  {photo.author && photo.license && " · "}
                  {photo.license}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        Quelle:{" "}
        <a
          href="https://panoramax.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Panoramax
        </a>
      </p>
    </div>
  );
}
