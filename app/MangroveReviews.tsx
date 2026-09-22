"use client";

import { useEffect, useState } from "react";

type Review = {
  signature: string;
  place: string;
  rating: number | null;
  opinion: string;
  author: string;
};

type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type RawReview = {
  signature: string;
  payload: {
    sub: string;
    rating?: number | null;
    opinion?: string;
    metadata?: { nickname?: string; given_name?: string };
  };
};

function placeName(sub: string) {
  const match = /[?&]q=([^&]*)/.exec(sub);
  if (!match) return "Ort ohne Namen";
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {
    return match[1];
  }
}

export default function MangroveReviews({ lat, lon, enabled }: Props) {
  const coordKey = `${lat},${lon}`;
  const [result, setResult] = useState<{
    key: string;
    reviews: Review[] | null;
  } | null>(null);
  const current = result?.key === coordKey ? result : null;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // Der Radius steckt im geo-URI selbst (u = Meter) und muss mitkodiert werden,
        // sonst liest die API ihn als eigenen Query-Parameter und ignoriert ihn.
        const subject = encodeURIComponent(`geo:${lat},${lon}?u=1000`);
        const res = await fetch(
          `https://api.mangrove.reviews/reviews?sub=${subject}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reviews: Review[] = (data.reviews as RawReview[])
          .filter((entry) => entry.payload.opinion || entry.payload.rating)
          .slice(0, 5)
          .map((entry) => ({
            signature: entry.signature,
            place: placeName(entry.payload.sub),
            rating: entry.payload.rating ?? null,
            opinion: entry.payload.opinion ?? "",
            author:
              entry.payload.metadata?.nickname ??
              entry.payload.metadata?.given_name ??
              "",
          }));
        setResult({ key: coordKey, reviews });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key: coordKey, reviews: null });
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
        Bewertungen (Mangrove)
      </h2>
      <p className="text-zinc-700 dark:text-zinc-300">
        Offene Bewertungen im Umkreis von 1 km
      </p>
      {current === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">Lädt …</p>
      ) : current.reviews === null ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Bewertungen konnten nicht geladen werden.
        </p>
      ) : current.reviews.length === 0 ? (
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Keine Bewertungen in der Nähe.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {current.reviews.map((review) => (
            <li key={review.signature}>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                {review.place}
                {review.rating !== null && (
                  <span className="font-normal text-zinc-700 dark:text-zinc-300">
                    {" "}
                    · {review.rating} von 100
                  </span>
                )}
              </p>
              {review.opinion && (
                <p className="text-base text-zinc-700 dark:text-zinc-300">
                  {review.opinion.length > 160
                    ? `${review.opinion.slice(0, 160)} …`
                    : review.opinion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        Quelle:{" "}
        <a
          href="https://open-reviews.net"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-800 underline dark:text-blue-300"
        >
          Mangrove / open-reviews.net
        </a>
      </p>
    </div>
  );
}
