"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

const ZOOM = 16;

// Eigenes SVG statt Leaflets Standard-Icon: Dessen PNGs findet der Bundler nicht.
const PIN_HTML = `<svg viewBox="0 0 24 36" width="36" height="54" aria-hidden="true">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0Z" fill="#1e40af" stroke="#fff" stroke-width="1.5"/>
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
  const onMoveRef = useRef(onMove);
  const initialPos = useRef<[number, number]>([lat, lon]);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  // Leaflet greift beim Import auf `window` zu, darf also erst im Browser geladen werden.
  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current).setView(initialPos.current, ZOOM);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      }).addTo(map);

      const marker = L.marker(initialPos.current, {
        draggable: true,
        autoPan: true,
        title: "Standort – zum Ändern verschieben",
        alt: "Standort",
        icon: L.divIcon({
          html: PIN_HTML,
          className: "",
          iconSize: [36, 54],
          iconAnchor: [18, 54],
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
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
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
      className="location-map z-0 h-96 w-full rounded-lg border-2 border-zinc-500 dark:border-zinc-400"
    />
  );
}
