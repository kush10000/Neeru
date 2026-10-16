import "server-only";
import type { LonLat } from "./geo";

// Photon (komoot) reverse geocoding. Fair use: cache by ~100 m cell, short timeout.
const cache = new Map<string, string | null>();
const CACHE_MAX = 1000;

type PhotonProps = {
  name?: string;
  street?: string;
  locality?: string;
  district?: string;
  suburb?: string;
  city?: string;
};

export function formatPlace(p: PhotonProps): string | null {
  const parts = [p.name ?? p.street, p.locality ?? p.district ?? p.suburb].filter(Boolean) as string[];
  const unique = [...new Set(parts)];
  return unique.length ? unique.join(", ") : (p.city ?? null);
}

export async function reverseGeocode([lon, lat]: LonLat): Promise<string | null> {
  const key = `${lon.toFixed(3)},${lat.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key)!;

  let place: string | null = null;
  try {
    const url = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}&lang=en&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "neeru-waterlogging-map" },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = (await res.json()) as { features?: { properties: PhotonProps }[] };
      const props = json.features?.[0]?.properties;
      place = props ? formatPlace(props) : null;
    }
  } catch {
    return null; // don't cache transient failures
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, place);
  return place;
}
