This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Verwendete APIs

Alle Dienste sind frei nutzbar. Einzige Ausnahme ist Mapillary: Es braucht einen kostenlosen
Client-Token (siehe unten); alle anderen kommen ohne API-Schlüssel aus.
Alle werden direkt aus dem Browser aufgerufen (CORS erlaubt). Die Seite läuft als statischer
Export auf GitHub Pages und hat deshalb keine serverseitigen Routen.

| Dienst | Zweck | Aufruf |
| --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org) | Karte und Link zum Standort | `export/embed.html?bbox=…&marker=…` als `<iframe>`, plus `?mlat=…&mlon=…` als Weblink |
| [Open-Meteo](https://open-meteo.com) | Aktuelles Wetter | `GET api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current_weather=true` |
| [Transitous](https://transitous.org) ([MOTIS](https://github.com/motis-project/motis)) | Haltestellen und Abfahrten, deutschlandweit | `GET api.transitous.org/api/v1/map/stops?min=…&max=…` für Haltestellen in einer Bounding-Box, danach `GET …/api/v1/stoptimes?stopId=…&n=…&radius=…` für die Abfahrten |
| [Wikipedia](https://de.wikipedia.org) (MediaWiki API) | Fotos von Orten in der Umgebung | `GET de.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=…&prop=pageimages` |
| [Wikimedia Commons](https://commons.wikimedia.org) (MediaWiki API) | Urheber und Lizenz zu diesen Fotos | `GET commons.wikimedia.org/w/api.php?action=query&titles=File:…&prop=imageinfo&iiprop=extmetadata` |
| [Wikidata](https://www.wikidata.org) (MediaWiki API) | Relevante Artikel in der Nähe | `GET www.wikidata.org/w/api.php?action=query&list=geosearch&gscoord=…&gsradius=1000&gslimit=100`, danach `…?action=wbgetentities&ids=…&props=labels\|descriptions\|sitelinks/urls&languages=de&languagefallback=1` in Blöcken zu 50 IDs |
| [Mangrove](https://open-reviews.net) | Offene Bewertungen im Umkreis | `GET api.mangrove.reviews/reviews?sub={geo-URI}` |
| [KartaView](https://kartaview.org) | Straßenfotos der Community | `GET api.openstreetcam.org/2.0/photo/?lat=…&lng=…&zoomLevel=18&join=sequence&orderBy=id&orderDirection=desc`, Bilder von `storage*.openstreetcam.org` |
| [Panoramax](https://panoramax.fr) | Straßen- und 360°-Fotos, föderiert | `GET api.panoramax.xyz/api/search?place_position={lon},{lat}&place_distance=0-{Meter}&limit=100`, Bilder von der jeweiligen Instanz |
| [Mapillary](https://www.mapillary.com) | Straßen- und 360°-Fotos mit eingebettetem Viewer | `GET graph.mapillary.com/images?access_token=…&bbox=…&fields=id,captured_at,is_pano,sequence,geometry`, danach `GET graph.mapillary.com/{id}?fields=thumb_1024_url,creator` je angezeigtem Foto, Viewer als `<iframe>` von `mapillary.com/embed?image_key=…`; ohne Token nur Weblink |

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
- **Amtliche Warnungen (NINA)** waren einmal eingebaut und sind seit der Umstellung auf GitHub
  Pages deaktiviert: NINA sendet keine CORS-Header, der Aufruf braucht also einen Server. Der
  Code dafür steht in der Git-Historie (`app/api/warnings/route.ts`, Commit `8ec9106a`) und
  lässt sich bei einem Deployment mit Server-Laufzeit zurückholen. Merkposten für dann: NINA
  kennt den Gemeindeschlüssel nur auf Kreisebene — die ersten fünf Stellen des
  Regionalschlüssels, auf zwölf Stellen mit Nullen aufgefüllt; feinere Schlüssel liefern 404.
  Den Schlüssel selbst liefert Nominatim im Feld `de:regionalschluessel`.
- **Wikidata** (`app/WikidataArticles.tsx`) findet über `list=geosearch` die 100 nächsten
  Objekte im Umkreis von 1 km und lädt dann Bezeichnung, Beschreibung und Sitelinks per
  `wbgetentities`. Als Relevanz gilt die Zahl der Wikipedia-Sprachversionen (Sitelinks auf
  `*.wikipedia.org`); Objekte ohne jeden Wikipedia-Artikel fallen raus, angezeigt werden die
  zwölf relevantesten. In Innenstädten reichen 100 Treffer oft nur 200–300 m weit, weil dort
  Stolpersteine und Einzeldenkmale dicht liegen. Die
  [REST API](https://www.wikidata.org/wiki/Wikidata:REST_API/de) (`/w/rest.php/wikibase/v1/…`)
  ist bewusst nicht im Einsatz: Sie hat keine Geosuche und liefert nur ein Item pro Aufruf.
  Beim Test mit 100 Einzelabrufen je Ort kam nach rund 250 Anfragen `429 Too Many Requests`
  (Stand 2026-09-30). `wbgetentities` braucht für dieselben Daten zwei Aufrufe.
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
- **KartaView** zeigt die nächstgelegenen Straßenfotos (`app/KartaViewPhotos.tsx`), ohne Token.
  Doku: <https://kartaview.org/doc/authentication>. Wichtig: nur mit `zoomLevel` und `orderBy=id&orderDirection=desc` suchen — fehlt die Sortierung, läuft die Abfrage ebenfalls in den Timeout. Die in
  der Doku zuerst gezeigte Suche mit `radius` läuft serverseitig in `408 Query timeout`, auch mit
  Token; `api.kartaview.org` antwortet nicht, nur `api.openstreetcam.org` (Stand 2026-09-29).
  `zoomLevel` liefert das nächste Foto je Sequenz im Umkreis von etwa 200 m; ein kleinerer Wert
  vergrößert den Umkreis nicht. Die Abdeckung ist lückenhaft (Berlin-Mitte ja, Hamburger Rathaus
  nein). Ein Token würde nur das Limit von 100 auf 1.000 Anfragen pro Stunde heben und läge im
  Browser-Code offen, deshalb keiner. Die Bilder stehen unter CC BY-SA 4.0; der Hinweis unter
  den Fotos muss bleiben.
- **Panoramax** (`app/PanoramaxPhotos.tsx`) wird über den Metakatalog `api.panoramax.xyz`
  abgefragt, der alle föderierten Instanzen (OSM France, IGN, …) durchsucht. Doku:
  <https://docs.panoramax.fr/backend/api/api/>, STAC-API, ohne Token, CORS offen, Antwort in
  unter 0,5 s. Achtung: `place_position` erwartet **Länge vor Breite**. Radius 200 m,
  ersatzweise 1 km. Die Treffer kommen nicht nach Entfernung sortiert und enthalten viele fast
  gleiche Fotos derselben Sequenz; die Komponente rechnet die Entfernung selbst und behält das
  nächste Foto je Sequenz (`collection`). Bild-URLs liegen auf wechselnden Instanz-Hosts, daher
  `unoptimized` statt `remotePatterns`. Lizenz und Urheber stehen je Foto im Ergebnis
  (`properties.license`, meist CC-BY-SA-4.0 oder etalab-2.0; `providers` mit Rolle `producer`)
  und werden unter jedem Foto angezeigt. 360° erkennt man an
  `pers:interior_orientation.field_of_view = 360`. Stand 2026-09-29 ergänzt Panoramax KartaView
  gut: Hamburg und München haben Treffer, Berlin-Mitte kaum.
- **Mapillary** (`app/MapillaryPhotos.tsx`) sucht über die Graph API
  (<https://www.mapillary.com/developer/api-documentation>) Fotos in einer Bounding-Box um den
  Punkt (Größe siehe unten), behält das nächste Foto je Sequenz und zeigt bis zu
  sechs Vorschaubilder. Das nächstgelegene läuft im eingebetteten Viewer
  (`mapillary.com/embed?image_key=…&style=photo`, 360° drehbar); ein Klick auf ein
  Vorschaubild wechselt das Foto. Die Kartenansicht `/app` schickt `X-Frame-Options: DENY`,
  nur `/embed` lässt sich einbetten, und das nur mit Bild-ID aus der Graph API.
  - Die Graph API verlangt einen Token, auch zum Lesen; ohne kommt
    `190 Invalid OAuth 2.0 Access Token`, die Vektorkacheln antworten mit 403.
  - Der Token ist ein kostenloser *Client-Token* (`MLY|…`) aus einer App unter
    <https://www.mapillary.com/dashboard/developers>. Er ist für den Browser gedacht und nur
    lesend; er landet beim Build im JavaScript und ist damit öffentlich einsehbar.
  - Lokal steht er in `.env.local` als `NEXT_PUBLIC_MAPILLARY_TOKEN=…` (Dev-Server danach neu
    starten). Für GitHub Pages liest der Workflow das Repository-Secret `MAPILLARY_TOKEN`.
  - Fehlt der Token, zeigt das Widget eine „Nicht verfügbar“-Karte mit Weblink.
  - Die Bounding-Box-Suche ist der heikle Teil: In dichten Gegenden (Berlin-Mitte) antwortet
    die API mit HTTP 500 „Please reduce the amount of data you're asking for“ — schon bei
    200 m Kantenlänge und auch mit `limit=25` und nur leichten Feldern (Stand 2026-09-30).
    Entscheidend ist also die Fläche. Das Widget beginnt mit 100 m Kantenlänge, halbiert die
    Box bei einem 500 (bis etwa 12 m) und vergrößert sie nur bei leerem Ergebnis (bis 1,6 km).
    Vorschau-URL und Urheber werden danach einzeln für die höchstens sechs angezeigten Fotos
    geholt (`GET /{id}`). Die Suche liefert nicht nach Entfernung sortiert; bei gekapptem
    Limit kann das nächste Foto fehlen.
  - Fehlermeldungen der Graph API (`error.message`) zeigt das Widget an, damit man sie ohne
    Entwicklerwerkzeuge sieht.
  - Bilder stehen unter CC BY-SA 4.0; Lizenz und Urheber (`creator.username`) stehen unter
    dem Viewer und müssen dort bleiben.
- **Panomax** (feste 360°-Panoramakameras, überwiegend im Alpenraum) war als Weblink-Karte
  eingebunden und ist seit 2026-09-30 entfernt: keine öffentliche API, keine URL, die
  Koordinaten entgegennimmt — der Link führte nur auf die allgemeine Übersichtskarte.
- Alle Datenquellen sind Gemeinschaftsprojekte ohne Verfügbarkeitsgarantie. Fehler werden
  im UI abgefangen, nicht per Retry.

Wird eine API ergänzt, ersetzt oder entfernt, gehört dieser Abschnitt mit angepasst.

### Weitere Foto-Quellen (geprüft, nicht eingebaut)

Stand 2026-09-22 auf Erreichbarkeit, Schlüsselpflicht und CORS getestet, falls die
Wikipedia-Artikelbilder einmal nicht ausreichen:

| Quelle | Schlüssel | Eignung |
| --- | --- | --- |
| [Flickr](https://www.flickr.com/services/api/) | API-Key nötig | Sehr großer Bestand, Geosuche mit Lizenzfilter (`flickr.photos.search` mit `lat`/`lon`/`radius`). Bildqualität und Ortsbezug schwanken stark. |
| [Wikidata](https://query.wikidata.org) (SPARQL) | keiner, CORS offen | Läuft sofort. `SERVICE wikibase:around` plus `wdt:P18` liefert Objektfotos im Umkreis, teils andere Objekte als die Artikelsuche (U-Bahnhöfe, Institutionen). Naheliegendste Ergänzung ohne Registrierung. |
| [iNaturalist](https://api.inaturalist.org/v1/docs/) | keiner, CORS offen | Tier- und Pflanzenfotos mit Koordinaten, sehr dichte Abdeckung. Zeigt Arten, keine Ortsansichten — nur für einen Naturschwerpunkt sinnvoll. |

Nicht geeignet: Unsplash und Pexels haben keine echte Geosuche, Panoramio ist eingestellt,
[Geograph](https://www.geograph.org.uk) deckt nur Großbritannien und Irland ab.

## Deployment

Die Seite liegt als statischer Export auf GitHub Pages:
<https://christiansozialhelden.github.io/experiment/>

Jeder Push auf `main` löst `.github/workflows/deploy.yml` aus. Der Workflow baut mit
`GITHUB_PAGES=true`; nur dann setzt `next.config.ts` `output: "export"` und den `basePath`
`/experiment`. Lokal bleibt alles beim normalen `next dev` ohne basePath.

Wichtig: GitHub Pages führt keinen Server aus. Route Handler unter `app/api/` brechen den
Build mit `output: "export"` ab — deshalb gibt es hier keine. Wer serverseitige Aufrufe
braucht (etwa für APIs ohne CORS-Header), muss auf eine Plattform mit Laufzeit wechseln.

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
