"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Photo = {
  pageId: number;
  title: string;
  thumbUrl: string;
  articleUrl: string;
  author: string;
  license: string;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type RawArticle = {
  pageid: number;
  title: string;
  thumbnail?: { source: string };
  pageimage?: string;
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
    { title: string; imageinfo?: { extmetadata?: Record<string, { value: string }> }[] }
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

export default function PlacePhotos({ lat, lon, enabled }: Props) {
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
        let articles: RawArticle[] = [];
        for (const radius of [1000, 5000]) {
          const params = new URLSearchParams({
            action: "query",
            generator: "geosearch",
            ggscoord: `${lat}|${lon}`,
            ggsradius: String(radius),
            ggslimit: "20",
            prop: "pageimages",
            piprop: "thumbnail|name",
            pithumbsize: "400",
            format: "json",
            origin: "*",
          });
          const res = await fetch(
            `https://de.wikipedia.org/w/api.php?${params}`,
            { signal: controller.signal },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const pages: Record<string, RawArticle> = data.query?.pages ?? {};
          articles = Object.values(pages).filter((p) => p.thumbnail);
          if (articles.length > 0) break;
        }
        articles = articles.slice(0, 6);

        const credits = await fetchCredits(
          articles.map((a) => a.pageimage).filter((n): n is string => !!n),
          controller.signal,
        );

        setResult({
          key: coordKey,
          photos: articles.map((a) => {
            const credit = a.pageimage
              ? credits.get(normalizeFileName(a.pageimage))
              : undefined;
            return {
              pageId: a.pageid,
              title: a.title,
              thumbUrl: a.thumbnail!.source,
              articleUrl: `https://de.wikipedia.org/?curid=${a.pageid}`,
              author: credit?.author ?? "",
              license: credit?.license ?? "",
            };
          }),
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
        Fotos aus der Umgebung
      </h2>
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.photos === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Fotos konnten nicht geladen werden.
        </p>
      ) : current.photos.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Keine Fotos in der Nähe gefunden.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-4">
          {current.photos.map((photo) => (
            <li key={photo.pageId}>
              <a href={photo.articleUrl} target="_blank" rel="noopener noreferrer">
                <Image
                  src={photo.thumbUrl}
                  alt={photo.title}
                  width={400}
                  height={300}
                  className="h-32 w-full rounded border-2 border-zinc-400 object-cover dark:border-zinc-600"
                  unoptimized
                />
                <span className="mt-1 block hyphens-auto break-words text-base text-blue-800 underline dark:text-blue-300">
                  {photo.title}
                </span>
              </a>
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
        Quelle: Wikipedia und Wikimedia Commons
      </p>
    </div>
  );
}
