import { distanceInMeters, type StreetPhoto } from "./photoSearch";

type RawArticle = {
  pageid: number;
  title: string;
  thumbnail?: { source: string };
  pageimage?: string;
  coordinates?: { lat: number; lon: number }[];
};

function normalizeFileName(name: string) {
  return name.replace(/^File:/, "").replace(/_/g, " ");
}

function toPlainText(html: string) {
  if (!html) return "";
  return (
    new DOMParser().parseFromString(html, "text/html").body.textContent ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchCredits(fileNames: string[], signal: AbortSignal) {
  const credits = new Map<string, { author: string; license: string }>();
  if (fileNames.length === 0) return credits;

  const params = new URLSearchParams({
    action: "query",
    titles: fileNames.map((name) => `File:${name}`).join("|"),
    prop: "imageinfo",
    iiprop: "extmetadata",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    signal,
  });
  if (!res.ok) return credits;

  const data = await res.json();
  const pages: Record<
    string,
    {
      title: string;
      imageinfo?: { extmetadata?: Record<string, { value: string }> }[];
    }
  > = data.query?.pages ?? {};
  for (const page of Object.values(pages)) {
    const meta = page.imageinfo?.[0]?.extmetadata ?? {};
    credits.set(normalizeFileName(page.title), {
      author: toPlainText(meta.Artist?.value ?? ""),
      license: toPlainText(meta.LicenseShortName?.value ?? ""),
    });
  }
  return credits;
}

// Artikelbilder von Wikipedia-Artikeln in der Nähe, Urheber und Lizenz von Commons.
export async function fetchWikipediaPhotos(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<StreetPhoto[]> {
  let articles: RawArticle[] = [];
  for (const radius of [1000, 5000]) {
    const params = new URLSearchParams({
      action: "query",
      generator: "geosearch",
      ggscoord: `${lat}|${lon}`,
      ggsradius: String(radius),
      ggslimit: "20",
      // `coordinates` liefert die Lage des Artikels, daraus die Entfernung fürs Sortieren.
      // Ohne `colimit` gibt es Koordinaten nur für die ersten 10 Artikel.
      prop: "pageimages|coordinates",
      colimit: "max",
      piprop: "thumbnail|name",
      // Groß genug für die Großansicht; im Raster wird es verkleinert.
      pithumbsize: "1024",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://de.wikipedia.org/w/api.php?${params}`, {
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const pages: Record<string, RawArticle> = data.query?.pages ?? {};
    articles = Object.values(pages).filter((p) => p.thumbnail);
    if (articles.length > 0) break;
  }
  const nearest = articles
    .map((a) => {
      const c = a.coordinates?.[0];
      return {
        article: a,
        distance: c ? distanceInMeters(lat, lon, c.lat, c.lon) : 0,
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);

  const credits = await fetchCredits(
    nearest.map((n) => n.article.pageimage).filter((n): n is string => !!n),
    signal,
  );

  return nearest.map(({ article: a, distance }) => {
    const credit = a.pageimage
      ? credits.get(normalizeFileName(a.pageimage))
      : undefined;
    return {
      id: `wikipedia:${a.pageid}`,
      title: a.title,
      thumbUrl: a.thumbnail!.source,
      largeUrl: a.thumbnail!.source,
      linkUrl: `https://de.wikipedia.org/?curid=${a.pageid}`,
      shotDate: "",
      distance,
      author: credit?.author ?? "",
      license: credit?.license ?? "",
      is360: false,
    };
  });
}
