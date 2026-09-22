import type { NextRequest } from "next/server";

const USER_AGENT = "koordinaten-demo/1.0 (https://github.com/sozialhelden)";

type NinaWarning = {
  id: string;
  payload?: {
    data?: {
      headline?: string;
      severity?: string;
    };
  };
  i18nTitle?: Record<string, string>;
};

async function findRegionKey(lat: number, lon: number) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    extratags: "1",
    zoom: "10",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 86400 } },
  );
  if (!res.ok) return null;

  const data = await res.json();
  const tags: Record<string, string> = data.extratags ?? {};
  const key =
    tags["de:regionalschluessel"] ?? tags["de:amtlicher_gemeindeschluessel"];
  if (!key) return null;

  // NINA kennt nur die Kreisebene: die ersten fünf Stellen, auf zwölf aufgefüllt.
  return `${key.slice(0, 5)}0000000`;
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return Response.json({ error: "Ungültige Koordinaten" }, { status: 400 });
  }

  const regionKey = await findRegionKey(lat, lon);
  if (!regionKey) {
    return Response.json({ region: null, warnings: [] });
  }

  const res = await fetch(
    `https://warnung.bund.de/api31/dashboard/${regionKey}.json`,
    { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 300 } },
  );
  if (!res.ok) {
    return Response.json({ error: "NINA nicht erreichbar" }, { status: 502 });
  }

  const raw: NinaWarning[] = await res.json();
  const warnings = raw.map((entry) => ({
    id: entry.id,
    headline:
      entry.payload?.data?.headline ??
      entry.i18nTitle?.de ??
      "Amtliche Warnung",
    severity: entry.payload?.data?.severity ?? "Unknown",
  }));

  return Response.json(
    { region: regionKey, warnings },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}
