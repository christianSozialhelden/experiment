"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, MaplibreGL, Marker } from "leaflet";
import type { StyleSpecification } from "maplibre-gl";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { darkMapStyle } from "./darkMapStyle";

const ZOOM = 16;

// Vektorkarte von OpenFreeMap (OSM-Daten): Schrift und Linien werden in der Auflösung des
// Displays gezeichnet statt als 256-px-Kachel hochskaliert. Die dunkle Variante wird aus
// demselben Stil berechnet (siehe darkMapStyle.ts).
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Gleiche Logik wie die `dark`-Variante in globals.css: Klasse `.dark` oder Systemeinstellung,
// solange nicht ausdrücklich `.light` gewählt ist.
function isDark() {
  const root = document.documentElement.classList;
  if (root.contains("dark")) return true;
  if (root.contains("light")) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Eigenes SVG statt Leaflets Standard-Icon: Dessen PNGs findet der Bundler nicht.
// Die viewBox hat 2 Einheiten Rand, weil der weiße Umriss zur Hälfte außerhalb der Form liegt
// und sonst abgeschnitten wird. Maßstab 1,5 ergibt ganze Pixel für Größe und Spitze (21/57).
const PIN_HTML = `<svg viewBox="-2 -2 28 40" width="42" height="60" aria-hidden="true">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0Z" fill="#1e40af" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="12" cy="12" r="4.5" fill="#fff"/>
</svg>`;

type Props = {
  lat: number;
  lon: number;
  onMove: (lat: number, lon: number) => void;
};

export default function LocationMap({ lat, lon, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const baseRef = useRef<MaplibreGL | null>(null);
  const onMoveRef = useRef(onMove);
  const initialPos = useRef<[number, number]>([lat, lon]);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  // Leaflet greift beim Import auf `window` zu, darf also erst im Browser geladen werden.
  useEffect(() => {
    let cancelled = false;
    let styles: { light: StyleSpecification; dark: StyleSpecification } | null =
      null;
    let dark = isDark();

    const applyTheme = () => {
      if (!styles || isDark() === dark) return;
      dark = !dark;
      baseRef.current
        ?.getMaplibreMap()
        .setStyle(dark ? styles.dark : styles.light);
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributeFilter: ["class"] });

    // Ohne 3D-Transforms legt der Browser die Nadel nicht auf eine eigene Ebene, sondern
    // rastet sie am Pixelraster ein. Sonst wird sie unscharf, sobald die Karte auf einer
    // krummen Pixelposition liegt (rem-Werte bei font-size: 84 %).
    (window as { L_DISABLE_3D?: boolean }).L_DISABLE_3D = true;

    // MapLibre braucht WebGL 2. Fehlt es (alte Geräte, abgeschaltet) oder lädt der Stil nicht,
    // bleibt es bei den Rasterkacheln von OSM.
    const webgl = !!document.createElement("canvas").getContext("webgl2");

    // Das MapLibre-Plugin erweitert das Leaflet-Modul, muss also danach geladen werden.
    import("leaflet").then(async (L) => {
      const [plugin, light] = webgl
        ? await Promise.all([
            import("@maplibre/maplibre-gl-leaflet"),
            fetch(STYLE_URL)
              .then((res) =>
                res.ok ? (res.json() as Promise<StyleSpecification>) : null,
              )
              .catch(() => null),
          ])
        : [null, null];
      if (cancelled || !containerRef.current) return;

      // zoomAnimation ausdrücklich aus: Ohne 3D läuft sie ohnehin nicht, aber das MapLibre-Plugin
      // prüft nur die Option und greift sonst auf das dann fehlende `map._proxy` zu.
      const map = L.map(containerRef.current, {
        maxZoom: 19,
        zoomAnimation: false,
      }).setView(initialPos.current, ZOOM);
      const osm =
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende';
      if (plugin && light) {
        styles = { light, dark: darkMapStyle(light) };
        dark = isDark();
        baseRef.current = plugin
          .maplibreGL({ style: dark ? styles.dark : styles.light })
          .addTo(map);
        map.attributionControl.addAttribution(
          `<a href="https://openfreemap.org">OpenFreeMap</a> ${osm}`,
        );
      } else {
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          className: "osm-tiles",
          attribution: osm,
        }).addTo(map);
      }

      const marker = L.marker(initialPos.current, {
        draggable: true,
        autoPan: true,
        title: "Standort – zum Ändern verschieben",
        alt: "Standort",
        icon: L.divIcon({
          html: PIN_HTML,
          className: "",
          iconSize: [42, 60],
          iconAnchor: [21, 57],
        }),
      }).addTo(map);

      const report = (pos: { lat: number; lng: number }) =>
        onMoveRef.current(pos.lat, L.Util.wrapNum(pos.lng, [-180, 180], true));

      marker.on("dragend", () => report(marker.getLatLng()));
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        report(e.latlng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
      media.removeEventListener("change", applyTheme);
      observer.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      baseRef.current = null;
    };
  }, []);

  // Koordinaten von außen (Eingabefelder, Stadt-Buttons) auf die Karte übertragen.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) {
      initialPos.current = [lat, lon];
      return;
    }
    const current = marker.getLatLng();
    if (current.lat === lat && current.lng === lon) return;
    marker.setLatLng([lat, lon]);
    if (!map.getBounds().pad(-0.1).contains([lat, lon])) {
      map.setView([lat, lon], map.getZoom());
    }
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Karte von OpenStreetMap. Nadel verschieben oder in die Karte klicken, um den Standort zu ändern."
      className="location-map z-0 h-[clamp(14rem,calc(100svh-22.5rem),24rem)] w-full rounded-lg border-2 border-zinc-500 dark:border-zinc-400"
    />
  );
}
