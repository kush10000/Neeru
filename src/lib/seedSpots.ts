// Seed spots: supabase/spots.json is the source of truth, edited via /dev/spots.
// supabase/seed.sql is generated from it.

import { z } from "zod";
import { BENGALURU_BBOX as B, inBengaluru, type LonLat } from "./geo";

export const SPOT_SOURCES = ["community", "news", "bbmp_list"] as const;

export const seedSpotSchema = z.object({
  name: z.string().trim().min(1).max(120),
  lon: z.number().min(B.minLon).max(B.maxLon),
  lat: z.number().min(B.minLat).max(B.maxLat),
  source: z.enum(SPOT_SOURCES),
  notes: z.string().trim().max(500),
  verified: z.boolean(),
});
export const seedSpotsSchema = z.array(seedSpotSchema).max(1000);
export type SeedSpot = z.infer<typeof seedSpotSchema>;

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function renderSeedSql(spots: SeedSpot[]): string {
  const rows = spots.map(
    (s) =>
      `  (${sqlString(s.name)}, ${s.lon.toFixed(6)}, ${s.lat.toFixed(6)}, ${sqlString(s.source)}, ` +
      `${s.notes ? sqlString(s.notes) : "null"}, ${s.verified})`,
  );
  return `-- GENERATED from supabase/spots.json by the /dev/spots editor. Don't edit by hand.
-- Known flood-prone spots (SPEC.md §9). verified = pin checked against the real location.

insert into public.spots (name, geom, source, notes)
select name, extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)::extensions.geography, source, notes
from (values
${rows.join(",\n") || "  (null::text, null::float8, null::float8, null::text, null::text, null::boolean)"}
) as t(name, lon, lat, source, notes, verified)
where name is not null;
`;
}

/**
 * Parses a coordinate pair pasted from Google Maps / OSM, in either order:
 * "12.9177, 77.6238" (lat, lon, as Google shows it), "77.6238 12.9177",
 * or a URL containing "@12.9177,77.6238,17z" / "?mlat=…&mlon=…".
 * Order is decided by which value falls in Bengaluru's lon vs lat range.
 */
export function parseCoordPair(text: string): LonLat | null {
  const nums = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  // A URL may contain other numbers first; scan for the first adjacent pair that fits.
  for (let i = 0; i + 1 < nums.length; i++) {
    const [a, b] = [nums[i], nums[i + 1]];
    if (inBengaluru([b, a])) return [b, a];
    if (inBengaluru([a, b])) return [a, b];
  }
  return null;
}
