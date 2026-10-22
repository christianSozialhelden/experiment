import type { StyleSpecification } from "maplibre-gl";

// Dunkle Variante eines hellen MapLibre-Stils. OpenFreeMaps eigener `dark`-Stil ist fast nur
// grau; hier bleibt der Farbton jeder Farbe erhalten (Wasser blau, Parks grün), nur die
// Helligkeit wird umgedreht.

type Hsla = [h: number, s: number, l: number, a: number];

function parseColor(value: string): Hsla | null {
  const v = value.trim().toLowerCase();

  const hex = v.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length <= 4) digits = [...digits].map((d) => d + d).join("");
    const n = digits.match(/../g)!.map((pair) => parseInt(pair, 16) / 255);
    return rgbToHsl(n[0], n[1], n[2], n[3] ?? 1);
  }

  const fn = v.match(/^(rgb|hsl)a?\(([^)]+)\)$/);
  if (!fn) return null;
  const parts = fn[2]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(parseFloat);
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  const a = parts[3] ?? 1;
  if (fn[1] === "hsl") return [parts[0], parts[1] / 100, parts[2] / 100, a];
  return rgbToHsl(parts[0] / 255, parts[1] / 255, parts[2] / 255, a);
}

function rgbToHsl(r: number, g: number, b: number, a: number): Hsla {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l, a];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d + 6) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h * 60, s, l, a];
}

const pct = (x: number) => `${(Math.min(1, Math.max(0, x)) * 100).toFixed(1)}%`;

// Flächen und Halos: Helligkeit umdrehen und in einen dunklen Bereich stauchen, damit das
// Land fast schwarz wird und Wasser, Parks und Gebäude sich davon abheben.
// Linien: nur abdunkeln, nicht umdrehen. Sonst würden weiße Straßen schwärzer als das Land.
// Sie behalten den Großteil ihrer Sättigung, damit Autobahnen und Hauptstraßen kräftig bleiben.
// Schrift: hell, mit dunklerem Text für hellere Ursprungsfarben (Hierarchie bleibt erhalten).
function darken(color: string, property: string): string {
  const hsla = parseColor(color);
  if (!hsla) return color;
  const [h, s, l, a] = hsla;
  const lightness = property.startsWith("text-color")
    ? 0.92 - l * 0.35
    : property.startsWith("line-")
      ? l * 0.55
      : 0.12 + (1 - l) * 0.75;
  if (property.startsWith("line-")) {
    return `hsla(${h.toFixed(1)}, ${pct(s * 0.7)}, ${pct(lightness)}, ${a})`;
  }
  // Buntheit (Chroma) statt HSL-Sättigung übernehmen: Fast-Weiß mit leichtem Farbstich hat
  // eine hohe Sättigung und würde dunkel kräftig braun, Wasser dagegen soll blau bleiben.
  const chroma = s * (1 - Math.abs(2 * l - 1)) * 0.85;
  const span = 1 - Math.abs(2 * lightness - 1);
  const saturation = span > 0 ? chroma / span : 0;
  return `hsla(${h.toFixed(1)}, ${pct(saturation)}, ${pct(lightness)}, ${a})`;
}

// Farben stehen auch in Ausdrücken (["interpolate", …, "#fff"]) und alten `stops`-Objekten.
function walk(value: unknown, property: string): unknown {
  if (typeof value === "string") return darken(value, property);
  if (Array.isArray(value)) return value.map((v) => walk(v, property));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, walk(v, property)]),
    );
  }
  return value;
}

export function darkMapStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!("paint" in layer) || !layer.paint) return layer;
      const paint: Record<string, unknown> = { ...layer.paint };
      for (const [key, value] of Object.entries(paint)) {
        if (key.endsWith("-color")) paint[key] = walk(value, key);
      }
      // Die schattierte Reliefkarte für kleine Zoomstufen ist ein helles Rasterbild.
      if (layer.type === "raster") paint["raster-brightness-max"] = 0.35;
      return { ...layer, paint } as typeof layer;
    }),
  };
}
