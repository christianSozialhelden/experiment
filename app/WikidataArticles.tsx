"use client";

import { useEffect, useState } from "react";

type Article = {
  id: string;
  label: string;
  description: string;
  distance: number;
  languageCount: number;
  articleUrl: string | null;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type RawEntity = {
  id: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  sitelinks?: Record<string, { url: string }>;
};

const API = "https://www.wikidata.org/w/api.php";

export default function WikidataArticles({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    articles: Article[] | null;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const geoParams = new URLSearchParams({
          action: "query",
          list: "geosearch",
          gscoord: `${lat}|${lon}`,
          gsradius: "1000",
          gslimit: "100",
          gsnamespace: "0",
          format: "json",
          origin: "*",
        });
        const geoRes = await fetch(`${API}?${geoParams}`, {
          signal: controller.signal,
        });
        if (!geoRes.ok) throw new Error(`HTTP ${geoRes.status}`);
        const geoData = await geoRes.json();
        const hits: { title: string; dist: number }[] =
          geoData.query?.geosearch ?? [];
        const distances = new Map(hits.map((h) => [h.title, h.dist]));

        // wbgetentities nimmt höchstens 50 IDs pro Aufruf.
        const ids = hits.map((h) => h.title);
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
        const entityLists = await Promise.all(
          chunks.map(async (chunk) => {
            const params = new URLSearchParams({
              action: "wbgetentities",
              ids: chunk.join("|"),
              props: "labels|descriptions|sitelinks/urls",
              languages: "de",
              languagefallback: "1",
              format: "json",
              origin: "*",
            });
            const res = await fetch(`${API}?${params}`, {
              signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return Object.values(data.entities ?? {}) as RawEntity[];
          }),
        );

        // Relevanz = Zahl der Wikipedia-Sprachversionen. Objekte ganz ohne
        // Wikipedia-Artikel (Stolpersteine, Straßen, Einzeldenkmale) fallen raus.
        const articles: Article[] = entityLists
          .flat()
          .map((entity) => {
            const sitelinks = Object.values(entity.sitelinks ?? {});
            return {
              id: entity.id,
              label: entity.labels?.de?.value ?? entity.id,
              description: entity.descriptions?.de?.value ?? "",
              distance: distances.get(entity.id) ?? 0,
              languageCount: sitelinks.filter((s) =>
                new URL(s.url).hostname.endsWith(".wikipedia.org"),
              ).length,
              articleUrl: entity.sitelinks?.dewiki?.url ?? null,
            };
          })
          .filter((a) => a.languageCount > 0)
          .sort(
            (a, b) =>
              b.languageCount - a.languageCount || a.distance - b.distance,
          )
          .slice(0, 12);

        setResult({ key: coordKey, articles });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key: coordKey, articles: null });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, lat, lon, coordKey]);

  if (!enabled) return null;

  return (
    <div className="rounded-lg border-2 border-zinc-400 p-4 text-lg md:col-span-2 lg:col-span-3 dark:border-zinc-600">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Wissenswertes in der Nähe
      </h2>
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.articles === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Artikel konnten nicht geladen werden.
        </p>
      ) : current.articles.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Keine Artikel in der Nähe gefunden.
        </p>
      ) : (
        <ul className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.articles.map((article) => {
            const wikidataUrl = `https://www.wikidata.org/wiki/${article.id}`;
            return (
              <li key={article.id}>
                <a
                  href={article.articleUrl ?? wikidataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hyphens-auto break-words font-medium text-blue-800 underline dark:text-blue-300"
                >
                  {article.label}
                </a>
                {article.description && (
                  <p className="text-base text-zinc-800 dark:text-zinc-200">
                    {article.description}
                  </p>
                )}
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {Math.round(article.distance)} m entfernt ·{" "}
                  {article.languageCount === 1
                    ? "1 Sprache"
                    : `${article.languageCount} Sprachen`}
                  {!article.articleUrl && " · kein deutscher Artikel"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        Quelle:{" "}
        <a
          href="https://www.wikidata.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Wikidata
        </a>
        , sortiert nach Zahl der Wikipedia-Sprachversionen
      </p>
    </div>
  );
}
