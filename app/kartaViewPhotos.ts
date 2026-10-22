import { distanceInMeters, type StreetPhoto } from "./photoSearch";

type RawPhoto = {
  id: string;
  fileurlLTh: string;
  fileurlProc?: string;
  lat: string;
  lng: string;
  sequenceIndex: string;
  shotDate: string | null;
  sequence: { id: string };
};

function formatDate(shotDate: string) {
  const date = new Date(shotDate.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export async function fetchKartaViewPhotos(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<StreetPhoto[]> {
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
    { signal },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const raw: RawPhoto[] = data.result?.data ?? [];

  return raw
    .filter((p) => p.fileurlLTh)
    .map((p) => ({
      id: `kartaview:${p.id}`,
      thumbUrl: p.fileurlLTh,
      largeUrl: p.fileurlProc ?? p.fileurlLTh,
      linkUrl: `https://kartaview.org/details/${p.sequence.id}/${p.sequenceIndex}`,
      shotDate: p.shotDate ? formatDate(p.shotDate) : "",
      // Das Feld `distance` der API steht oft auf 0, auch bei Fotos einige Meter weiter.
      distance: distanceInMeters(lat, lon, Number(p.lat), Number(p.lng)),
      author: "",
      license: "CC BY-SA 4.0",
      is360: false,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
}
