// UV-Index, Luftqualität und Pollen von Open-Meteo (Air Quality API, ohne Token).
// Pollen gibt es nur für Europa; außerhalb sind die Werte null.

export type AirQuality = {
  aqi: number | null;
  uv: number | null;
  pollen: { name: string; level: string }[] | null;
};

const POLLEN: Record<string, string> = {
  alder_pollen: "Erle",
  birch_pollen: "Birke",
  grass_pollen: "Gräser",
  mugwort_pollen: "Beifuß",
  olive_pollen: "Olive",
  ragweed_pollen: "Ambrosia",
};

// Europäischer Luftqualitätsindex (EAQI), Stufen der EEA.
export function aqiLabel(aqi: number) {
  if (aqi <= 20) return "sehr gut";
  if (aqi <= 40) return "gut";
  if (aqi <= 60) return "mäßig";
  if (aqi <= 80) return "schlecht";
  if (aqi <= 100) return "sehr schlecht";
  return "extrem schlecht";
}

// Stufen der WHO.
export function uvLabel(uv: number) {
  if (uv < 3) return "niedrig";
  if (uv < 6) return "mittel";
  if (uv < 8) return "hoch";
  if (uv < 11) return "sehr hoch";
  return "extrem";
}

// Grobe Einstufung in Pollen je m³, angelehnt an die Belastungsstufen des DWD.
function pollenLevel(grains: number) {
  if (grains < 10) return "gering";
  if (grains < 50) return "mäßig";
  return "stark";
}

export async function fetchAirQuality(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<AirQuality> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: ["european_aqi", "uv_index", ...Object.keys(POLLEN)].join(","),
    timezone: "auto",
  });
  const res = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
    { signal },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const current: Record<string, number | null> = (await res.json()).current;

  const values = Object.keys(POLLEN).map((key) => current[key]);
  return {
    aqi: current.european_aqi ?? null,
    uv: current.uv_index ?? null,
    pollen: values.every((v) => v === null || v === undefined)
      ? null
      : Object.entries(POLLEN)
          // Unter 1 Pollen je m³ spürt niemand etwas.
          .filter(([key]) => (current[key] ?? 0) >= 1)
          .map(([key, name]) => ({
            name,
            level: pollenLevel(current[key]!),
          })),
  };
}
