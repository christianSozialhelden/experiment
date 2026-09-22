This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Verwendete APIs

Alle Dienste sind frei nutzbar, ohne API-Schlüssel, und werden direkt aus dem Browser
aufgerufen (CORS erlaubt). Es gibt keine serverseitigen Routen und keine Secrets.

| Dienst | Zweck | Aufruf |
| --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org) | Karte und Link zum Standort | `export/embed.html?bbox=…&marker=…` als `<iframe>`, plus `?mlat=…&mlon=…` als Weblink |
| [Open-Meteo](https://open-meteo.com) | Aktuelles Wetter | `GET api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current_weather=true` |
| [Transitous](https://transitous.org) ([MOTIS](https://github.com/motis-project/motis)) | Haltestellen und Abfahrten, deutschlandweit | `GET api.transitous.org/api/v1/map/stops?min=…&max=…` für Haltestellen in einer Bounding-Box, danach `GET …/api/v1/stoptimes?stopId=…&n=…&radius=…` für die Abfahrten |

Hinweise zur Nutzung:

- **Open-Meteo** liefert `weathercode` nach WMO-Schlüssel; die deutschen Bezeichnungen und
  die Icon-Auswahl liegen in `app/OsmLinkForm.tsx` bzw. `app/WeatherIcon.tsx`.
- **Transitous** wird in zwei Schritten abgefragt, weil `reverse-geocode` nur Orte und POIs
  kennt und an vielen Stellen gar keine Haltestelle zurückgibt. Die Bounding-Box wächst bei
  Bedarf von 1 km über 5 km auf 20 km, damit auch ländliche Gegenden abgedeckt sind.
- Der Parameter `radius` bei `stoptimes` fasst alle Steige und Nachbarhaltestellen zusammen.
  Dieselbe Fahrt kann darum mehrfach erscheinen — einmal je Haltestelle.
- Beide Datenquellen sind Gemeinschaftsprojekte ohne Verfügbarkeitsgarantie. Fehler werden
  im UI abgefangen, nicht per Retry.

Wird eine API ergänzt, ersetzt oder entfernt, gehört dieser Abschnitt mit angepasst.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
