import { distanceInMeters, type StreetPhoto } from "./photoSearch";

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

type Candidate = {
  id: string;
  shotDate: string;
  distance: number;
  is360: boolean;
};

// Client-Token (MLY|…) ist für den Einsatz im Browser gedacht und wird beim
// Build in das JavaScript eingesetzt. Ohne Token bleibt nur der Weblink.
const TOKEN = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
export const MAPILLARY_AVAILABLE = !!TOKEN;

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
      if (
        !(error instanceof GraphError && error.status === 500) ||
        radius <= 12
      )
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

export async function fetchMapillaryPhotos(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<StreetPhoto[]> {
  const images = await searchImages(lat, lon, signal);

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
          signal,
        ) as Promise<RawDetails>,
    ),
  );
  const photos: StreetPhoto[] = [];
  details.forEach((d, i) => {
    if (d.status !== "fulfilled" || !d.value.thumb_1024_url) return;
    const { id, ...rest } = candidates[i];
    photos.push({
      ...rest,
      id: `mapillary:${id}`,
      thumbUrl: d.value.thumb_1024_url,
      // Die Kartenansicht `/app` verbietet das Einbetten, nur `/embed` geht.
      embedUrl: `https://www.mapillary.com/embed?image_key=${id}&style=photo`,
      largeUrl: d.value.thumb_1024_url,
      linkUrl: `https://www.mapillary.com/app/?pKey=${id}`,
      author: d.value.creator?.username ?? "",
      license: "CC BY-SA 4.0",
    });
  });
  const failure = details.find((d) => d.status === "rejected");
  if (photos.length === 0 && failure) throw failure.reason;
  return photos;
}
