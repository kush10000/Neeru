// Coordinate order is [lon, lat] everywhere.

export type LonLat = [lon: number, lat: number];

export const BENGALURU_BBOX = {
  minLon: 77.35,
  maxLon: 77.85,
  minLat: 12.75,
  maxLat: 13.2,
} as const;

export const BENGALURU_CENTER: LonLat = [77.5946, 12.9716];

export function inBengaluru([lon, lat]: LonLat): boolean {
  const b = BENGALURU_BBOX;
  return lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat;
}

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres. Client-side UX only; the server re-checks with PostGIS. */
export function distanceM([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Point at `distance` metres from `origin` along `bearing` (radians, clockwise from north). */
export function destination([lon, lat]: LonLat, distance: number, bearing: number): LonLat {
  const d = distance / EARTH_RADIUS_M;
  const lat1 = toRad(lat);
  const lon1 = toRad(lon);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
  const lon2 =
    lon1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [toDeg(lon2), toDeg(lat2)];
}

function bearing([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return Math.atan2(y, x);
}

/** If `point` is further than `radius` from `center`, pull it back onto the circle edge. */
export function clampToRadius(center: LonLat, point: LonLat, radius: number): LonLat {
  if (distanceM(center, point) <= radius) return point;
  // Slightly inside the edge so float error never fails the server check.
  return destination(center, radius * 0.98, bearing(center, point));
}

/** Closed polygon ring approximating a circle, for drawing the allowed-pin area. */
export function circleRing(center: LonLat, radius: number, steps = 48): LonLat[] {
  const ring: LonLat[] = [];
  for (let i = 0; i <= steps; i++) ring.push(destination(center, radius, (i / steps) * 2 * Math.PI));
  return ring;
}
