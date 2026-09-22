const CLOUD = "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z";
const CLOUD_SMALL = "M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25";

function group(code: number) {
  if (code <= 1) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "overcast";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  return "thunder";
}

export default function WeatherIcon({
  code,
  isDay,
  className,
}: {
  code: number;
  isDay: boolean;
  className?: string;
}) {
  const kind = group(code);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {kind === "clear" &&
        (isDay ? (
          <>
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ))}

      {kind === "partly" && (
        <>
          {isDay ? (
            <>
              <circle cx="6.5" cy="6.5" r="2.8" />
              <path d="M6.5 1.7v1.4M1.7 6.5h1.4M2.1 2.1l1.1 1.1M10.9 2.1l-1.1 1.1M2.1 10.9l1.1-1.1" />
            </>
          ) : (
            <path d="M11.2 7.2A4.6 4.6 0 1 1 5.9 1.9a3.6 3.6 0 0 0 5.3 5.3z" />
          )}
          <g transform="translate(6,7) scale(0.72)" strokeWidth={2.43}>
            <path d={CLOUD} fill="var(--background)" />
          </g>
        </>
      )}

      {kind === "overcast" && <path d={CLOUD} />}

      {kind === "fog" && (
        <>
          <path d={CLOUD_SMALL} />
          <path d="M5 19h14M7 22h10" />
        </>
      )}

      {kind === "drizzle" && (
        <>
          <path d={CLOUD_SMALL} />
          <path d="M8 18v1M12 19v1M16 18v1" />
        </>
      )}

      {kind === "rain" && (
        <>
          <path d={CLOUD_SMALL} />
          <path d="M8 17v4M12 18v4M16 17v4" />
        </>
      )}

      {kind === "snow" && (
        <>
          <path d={CLOUD_SMALL} />
          <path d="M8 18v3M6.7 18.8l2.6 1.4M9.3 18.8l-2.6 1.4M16 18v3M14.7 18.8l2.6 1.4M17.3 18.8l-2.6 1.4" />
        </>
      )}

      {kind === "thunder" && (
        <>
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
          <path d="M13 12l-4 6h5l-3.5 5" />
        </>
      )}
    </svg>
  );
}
