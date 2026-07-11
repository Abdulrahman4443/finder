import type { HeatPoint } from "./types";

/** Default map center (Lahore, Pakistan) used until the browser shares a location. */
export const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587];
export const DEFAULT_CITY = "Lahore";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Deterministic pseudo-random from a string seed, for stable jitter without Math.random. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Aggregate raw points into heat points, blurring each to protect exact addresses. */
export function toHeatPoints(
  points: { location: [number, number]; weight?: number; id: string }[],
): HeatPoint[] {
  return points.map((p) => {
    const rand = seededRandom(p.id);
    return {
      lat: p.location[0] + (rand() - 0.5) * 0.004,
      lng: p.location[1] + (rand() - 0.5) * 0.004,
      weight: p.weight ?? 0.6,
    };
  });
}

export function requestUserLocation(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { timeout: 5000, maximumAge: 600000 },
    );
  });
}
