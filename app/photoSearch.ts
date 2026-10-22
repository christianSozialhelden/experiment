import { useEffect, useState } from "react";

// Gemeinsames Format der Straßenfotos aller Dienste, damit sie in einem Raster gemischt
// und nach Entfernung sortiert werden können.
export type StreetPhoto = {
  // Mit Dienst-Präfix, weil sich IDs verschiedener Dienste überschneiden können.
  id: string;
  // Nur bei Fotos, die zu einem benannten Ort gehören (Wikipedia-Artikel).
  title?: string;
  thumbUrl: string;
  // Großansicht: eingebetteter Viewer, falls der Dienst einen anbietet, sonst Bild.
  embedUrl?: string;
  largeUrl: string;
  linkUrl: string;
  shotDate: string;
  distance: number;
  author: string;
  license: string;
  is360: boolean;
};

export type PhotoState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; photos: StreetPhoto[] };

export type PhotoLoader = (
  lat: number,
  lon: number,
  signal: AbortSignal,
) => Promise<StreetPhoto[]>;

export function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

// Sucht mit kurzer Verzögerung, damit beim Tippen in den Koordinatenfeldern nicht jede
// Zwischeneingabe eine Anfrage auslöst. `load` muss außerhalb der Komponente definiert sein.
export function usePhotoSearch(
  lat: number,
  lon: number,
  enabled: boolean,
  load: PhotoLoader,
): PhotoState {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    state: PhotoState;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const photos = await load(lat, lon, controller.signal);
        setResult({ key: coordKey, state: { status: "done", photos } });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: coordKey,
          state: {
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, lat, lon, coordKey, load]);

  return result?.key === coordKey ? result.state : { status: "loading" };
}
