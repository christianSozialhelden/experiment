type Props = {
  enabled: boolean;
};

export default function LibReviews({ enabled }: Props) {
  if (!enabled) return null;

  return (
    <section className="rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-100 p-4 text-lg dark:border-zinc-600 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
          lib.reviews
        </h2>
        <span className="rounded border border-zinc-500 px-2 py-0.5 text-sm font-medium text-zinc-700 dark:border-zinc-400 dark:text-zinc-300">
          Nicht verfügbar
        </span>
      </div>
      <p className="mt-2 text-zinc-700 dark:text-zinc-300">
        Freie Bewertungsplattform.
      </p>
      <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
        Kennt keine Suche nach Koordinaten, und der Datenbestand ist zu klein
        für brauchbare Treffer.
      </p>
      <a
        href="https://lib.reviews"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-12 items-center gap-2 text-base font-medium text-zinc-700 underline decoration-2 underline-offset-4 dark:text-zinc-300"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
        </svg>
        Website öffnen
      </a>
    </section>
  );
}
