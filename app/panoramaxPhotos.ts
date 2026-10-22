import { distanceInMeters, type StreetPhoto } from "./photoSearch";

type RawItem = {
  id: string;
  collection: string;
  geometry: { coordinates: [number, number] };
  assets: { thumb?: { href: string }; sd?: { href: string } };
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

function formatDate(datetime: string) {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export async function fetchPanoramaxPhotos(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<StreetPhoto[]> {
  let items: RawItem[] = [];
  for (const radius of [200, 1000]) {
    // Der Metakatalog durchsucht alle föderierten Panoramax-Instanzen.
    // `place_position` erwartet Länge vor Breite.
    const params = new URLSearchParams({
      place_position: `${lon},${lat}`,
      place_distance: `0-${radius}`,
      limit: "100",
    });
    const res = await fetch(`https://api.panoramax.xyz/api/search?${params}`, {
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    items = (data.features ?? []).filter((i: RawItem) => i.assets.thumb);
    if (items.length > 0) break;
  }

  // Aufeinanderfolgende Fotos einer Sequenz sehen fast gleich aus,
  // deshalb nur das nächstgelegene je Sequenz.
  const nearestPerSequence = new Map<string, StreetPhoto>();
  for (const item of items) {
    const [itemLon, itemLat] = item.geometry.coordinates;
    const distance = distanceInMeters(lat, lon, itemLat, itemLon);
    const known = nearestPerSequence.get(item.collection);
    if (known && known.distance <= distance) continue;
    const license = item.properties.license ?? "";
    nearestPerSequence.set(item.collection, {
      id: `panoramax:${item.id}`,
      thumbUrl: item.assets.thumb!.href,
      largeUrl: item.assets.sd?.href ?? item.assets.thumb!.href,
      linkUrl: `https://api.panoramax.xyz/#focus=pic&pic=${item.id}`,
      shotDate: item.properties.datetime
        ? formatDate(item.properties.datetime)
        : "",
      distance,
      author:
        item.providers?.find((p) => p.roles.includes("producer"))?.name ?? "",
      license: LICENSE_NAMES[license] ?? license,
      is360:
        item.properties["pers:interior_orientation"]?.field_of_view === 360,
    });
  }

  return [...nearestPerSequence.values()]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
}
