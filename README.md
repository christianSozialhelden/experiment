This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Verwendete APIs

Alle Dienste sind frei nutzbar und brauchen keinen API-Schlüssel; es gibt keine Secrets.
Die meisten werden direkt aus dem Browser aufgerufen (CORS erlaubt). Einzige Ausnahme sind die
amtlichen Warnungen: NINA sendet keine CORS-Header, deshalb läuft dieser Aufruf über die
Route `app/api/warnings/route.ts`.

| Dienst | Zweck | Aufruf |
| --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org) | Karte und Link zum Standort | `export/embed.html?bbox=…&marker=…` als `<iframe>`, plus `?mlat=…&mlon=…` als Weblink |
| [Open-Meteo](https://open-meteo.com) | Aktuelles Wetter | `GET api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current_weather=true` |
| [Transitous](https://transitous.org) ([MOTIS](https://github.com/motis-project/motis)) | Haltestellen und Abfahrten, deutschlandweit | `GET api.transitous.org/api/v1/map/stops?min=…&max=…` für Haltestellen in einer Bounding-Box, danach `GET …/api/v1/stoptimes?stopId=…&n=…&radius=…` für die Abfahrten |
| [Wikipedia](https://de.wikipedia.org) (MediaWiki API) | Fotos von Orten in der Umgebung | `GET de.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=…&prop=pageimages` |
| [Wikimedia Commons](https://commons.wikimedia.org) (MediaWiki API) | Urheber und Lizenz zu diesen Fotos | `GET commons.wikimedia.org/w/api.php?action=query&titles=File:…&prop=imageinfo&iiprop=extmetadata` |
| [NINA](https://warnung.bund.de) (Bundesamt für Bevölkerungsschutz) | Amtliche Gefahrenwarnungen | `GET warnung.bund.de/api31/dashboard/{AGS}.json`, **nur serverseitig** über `/api/warnings` |
| [Nominatim](https://nominatim.openstreetmap.org) | Amtlicher Gemeindeschlüssel zu den Koordinaten, nur für NINA | `GET /reverse?lat=…&lon=…&extratags=1`, **nur serverseitig** |
| [Mangrove](https://open-reviews.net) | Offene Bewertungen im Umkreis | `GET api.mangrove.reviews/reviews?sub={geo-URI}` |
| [KartaView](https://kartaview.org) | Straßenfotos der Community | `kartaview.org/map/@{lat},{lon},17z` als `<iframe>` |
| [Mapillary](https://www.mapillary.com) | 360°-Straßenfotos | nur als Weblink `mapillary.com/app/?lat=…&lng=…` |
| [Panomax](https://www.panomax.com) | Feste 360°-Panoramakameras | nur als Weblink auf die Übersichtskarte |

Hinweise zur Nutzung:

- **Open-Meteo** liefert `weathercode` nach WMO-Schlüssel; die deutschen Bezeichnungen und
  die Icon-Auswahl liegen in `app/OsmLinkForm.tsx` bzw. `app/WeatherIcon.tsx`.
- **Transitous** wird in zwei Schritten abgefragt, weil `reverse-geocode` nur Orte und POIs
  kennt und an vielen Stellen gar keine Haltestelle zurückgibt. Die Bounding-Box wächst bei
  Bedarf von 1 km über 5 km auf 20 km, damit auch ländliche Gegenden abgedeckt sind.
- Der Parameter `radius` bei `stoptimes` fasst alle Steige und Nachbarhaltestellen zusammen.
  Dieselbe Fahrt kann darum mehrfach erscheinen — einmal je Haltestelle.
- **Fotos** kommen aus Wikipedia-Artikeln in der Nähe, nicht aus der Commons-Geosuche: Letztere
  liefert alles, was zufällig Koordinaten trägt, also auch Massenimporte ohne Ortsbezug.
  Artikelbilder zeigen dagegen tatsächlich den Ort und haben einen lesbaren Titel, der sich als
  Alt-Text eignet. Radius 1 km, ersatzweise 5 km.
- Die Bilder stehen unter freien Lizenzen, die meist Namensnennung verlangen. Urheber und Lizenz
  werden deshalb aus Commons nachgeladen und unter jedem Foto angezeigt — dieser Schritt darf
  nicht wegoptimiert werden. Die Felder enthalten HTML und werden vor der Ausgabe in reinen
  Text umgewandelt, niemals per `dangerouslySetInnerHTML` eingebunden.
- **Warnungen** brauchen den amtlichen Gemeindeschlüssel, den NINA nur auf Kreisebene kennt:
  die ersten fünf Stellen des Regionalschlüssels, auf zwölf Stellen mit Nullen aufgefüllt.
  Feinere Schlüssel (etwa einer Verbandsgemeinde) liefern 404. Den Schlüssel selbst liefert
  Nominatim im Feld `de:regionalschluessel`. Angezeigt wird deshalb die Lage im ganzen
  Landkreis, nicht am exakten Punkt.
- Nominatim erlaubt höchstens eine Anfrage pro Sekunde und verlangt einen aussagekräftigen
  `User-Agent`. Beides ist in der Route umgesetzt, die Antworten werden einen Tag lang
  zwischengespeichert (Warnungen fünf Minuten).
- Die Route nimmt ausschließlich geprüfte Zahlen als Koordinaten entgegen und gibt sonst 400
  zurück — sie darf nie zu einem offenen Proxy für beliebige Ziele werden.
- **Mangrove** hat keinen Radius-Parameter. Der Umkreis steckt im Subject selbst, einem
  `geo:`-URI nach RFC 5870: `geo:{lat},{lon}?u={Meter}`. Das `?u=` muss mit URL-kodiert werden
  (`%3Fu%3D`), sonst liest die API es als eigenen Query-Parameter. Achtung: Unbekannte Parameter
  werden still ignoriert — ein erfundenes `?geo=…` liefert HTTP 200 und Ergebnisse aus aller
  Welt, was leicht für eine funktionierende Umkreissuche gehalten wird. Doku:
  <https://docs.mangrove.reviews>. Für Karten-Viewports gibt es zusätzlich `GET /geo` mit
  Bounding-Box.
- **lib.reviews** ist als deaktiviertes Widget eingebunden und ruft nichts ab. Die Plattform
  kennt keine Koordinatensuche, nur `GET /api/suggest/thing/{prefix}` über den Namen, und der
  Datenbestand ist zu klein: Berlin ergab einen Treffer, München und Dresden keinen. Die API
  ist undokumentiert (belegt im Quellcode von `routes/api.ts`), sendet CORS-Header und braucht
  keine Anmeldung; `GET /api/thing` ohne `url`-Parameter antwortet allerdings gar nicht.
  Für eine Reaktivierung müsste man den Ortsnamen serverseitig per Nominatim ermitteln.
- **360°-Fotos** sind aus drei Diensten eingebunden, mit sehr unterschiedlichem Ergebnis:
  - *KartaView* lässt sich als `<iframe>` mit Koordinaten einbetten und zeigt die Fotopunkte
    direkt. Die JSON-API (`api.kartaview.org`) war bei allen Tests nicht erreichbar —
    Verbindungsaufbau gelingt, die Antwort bleibt aus. Deshalb nur die Karteneinbettung.
  - *Mapillary* erlaubt Einbetten nur über `/embed` und nur mit einer konkreten Bild-ID; die
    bekommt man ausschließlich über die Graph API mit Token. Die Kartenansicht `/app` schickt
    `X-Frame-Options: DENY`. Ohne Token bleibt daher nur der Weblink. Mit einem kostenlosen
    Token ließe sich das nächstgelegene Bild ermitteln und einbetten.
  - *Panomax* hat keine öffentliche API und keine URL, die Koordinaten entgegennimmt. Der Link
    führt auf die Übersichtskarte, die Kameras stehen überwiegend im Alpenraum.
- Alle Datenquellen sind Gemeinschaftsprojekte ohne Verfügbarkeitsgarantie. Fehler werden
  im UI abgefangen, nicht per Retry.

Wird eine API ergänzt, ersetzt oder entfernt, gehört dieser Abschnitt mit angepasst.

### Weitere Foto-Quellen (geprüft, nicht eingebaut)

Stand 2026-09-22 auf Erreichbarkeit, Schlüsselpflicht und CORS getestet, falls die
Wikipedia-Artikelbilder einmal nicht ausreichen:

| Quelle | Schlüssel | Eignung |
| --- | --- | --- |
| [Mapillary](https://www.mapillary.com) | kostenloser Token nötig | Inzwischen als Weblink eingebunden. Mit Token ließe sich das nächstgelegene Bild einbetten statt nur zu verlinken; der Token läge im Browser-Code offen und bindet das Projekt an ein Meta-Konto. |
| [Flickr](https://www.flickr.com/services/api/) | API-Key nötig | Sehr großer Bestand, Geosuche mit Lizenzfilter (`flickr.photos.search` mit `lat`/`lon`/`radius`). Bildqualität und Ortsbezug schwanken stark. |
| [Wikidata](https://query.wikidata.org) (SPARQL) | keiner, CORS offen | Läuft sofort. `SERVICE wikibase:around` plus `wdt:P18` liefert Objektfotos im Umkreis, teils andere Objekte als die Artikelsuche (U-Bahnhöfe, Institutionen). Naheliegendste Ergänzung ohne Registrierung. |
| [iNaturalist](https://api.inaturalist.org/v1/docs/) | keiner, CORS offen | Tier- und Pflanzenfotos mit Koordinaten, sehr dichte Abdeckung. Zeigt Arten, keine Ortsansichten — nur für einen Naturschwerpunkt sinnvoll. |
| [KartaView](https://kartaview.org) | keiner | Karte ist als `<iframe>` eingebunden. Die JSON-API bleibt unerreichbar — für eigene Fotolisten statt Karteneinbettung erneut prüfen. |

Nicht geeignet: Unsplash und Pexels haben keine echte Geosuche, Panoramio ist eingestellt,
[Geograph](https://www.geograph.org.uk) deckt nur Großbritannien und Irland ab.

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
