type Props = {
  lat: number;
  lon: number;
  enabled: boolean;
};

type Service = {
  name: string;
  description: string;
  reason: string;
  href: string;
};

function services(lat: number, lon: number): Service[] {
  return [
    {
      name: "KartaView",
      description: "Straßenfotos der Community.",
      reason: "Die Karte lädt im eingebetteten Rahmen nicht zuverlässig.",
      href: `https://kartaview.org/map/@${lat},${lon},17z`,
    },
    {
      name: "Mapillary",
      description: "360°-Straßenfotos an diesem Punkt.",
      reason: "Einbetten nur mit Bild-ID aus der Token-API möglich.",
      href: `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`,
    },
    {
      name: "Panomax",
      description: "Feste 360°-Panoramakameras, überwiegend im Alpenraum.",
      reason: "Kein Zugriff über Koordinaten möglich.",
      href: "https://www.panomax.com/map",
    },
  ];
}

export default function Panoramas({ lat, lon, enabled }: Props) {
  if (!enabled) return null;

  return (
    <>
      {services(lat, lon).map((service) => (
        <section
          key={service.name}
          className="rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-100 p-4 text-lg dark:border-zinc-600 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              {service.name}
            </h2>
            <span className="rounded border border-zinc-500 px-2 py-0.5 text-sm font-medium text-zinc-700 dark:border-zinc-400 dark:text-zinc-300">
              Nicht verfügbar
            </span>
          </div>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            {service.description}
          </p>
          <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
            {service.reason}
          </p>
          <a
            href={service.href}
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
      ))}
    </>
  );
}
