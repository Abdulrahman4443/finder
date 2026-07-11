import type * as Leaflet from "leaflet";

export type LeafletModule = typeof Leaflet;

export type PlaceSuggestion = {
  id: string;
  label: string;
  secondary?: string;
  lat: number;
  lng: number;
};

let leafletPromise: Promise<LeafletModule> | null = null;

/** Load leaflet + the heat plugin once, client-side only. */
export function loadLeaflet(): Promise<LeafletModule> {
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then(async (mod) => {
      const L = (mod.default ?? mod) as LeafletModule;
      (globalThis as Record<string, unknown>).L = L;
      await import("leaflet.heat");
      return L;
    });
  }
  return leafletPromise;
}

export const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION = "© OpenStreetMap contributors © CARTO";

export function addDarkTiles(L: LeafletModule, map: Leaflet.Map) {
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
}

export function beaconIcon(
  L: LeafletModule,
  color: "gold" | "verify" | "alert" = "gold",
  size = 18,
) {
  const varName = color === "verify" ? "--verify" : color === "alert" ? "--alert" : "--gold";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:var(${varName});box-shadow:0 0 14px 3px color-mix(in oklab, var(${varName}) 55%, transparent);"></div>
      <div style="position:absolute;inset:-7px;border-radius:9999px;border:2px solid var(${varName});opacity:.55;animation:beacon-pulse 1.8s ease-out infinite;"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    state?: string;
    country?: string;
  };
};

function formatSuggestion(r: NominatimResult): PlaceSuggestion {
  const parts = r.display_name.split(",").map((p) => p.trim());
  const label = r.name || parts[0] || r.display_name;
  const secondary = parts.slice(1, 4).join(", ");
  return {
    id: String(r.place_id),
    label,
    secondary: secondary || undefined,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  };
}

export async function searchPlaces(query: string, limit = 6): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
      },
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  return data.map(formatSuggestion);
}

export async function geocode(query: string): Promise<[number, number] | null> {
  const [first] = await searchPlaces(query, 1);
  return first ? [first.lat, first.lng] : null;
}
