import { z } from "zod";
import { BENGALURU_BBOX as B } from "./geo";
import { NOTE_MAX_CHARS, SEVERITIES } from "./risk";

// Out-of-bbox usually means a lat/lon swap, so reject at the boundary.
const lon = z.number().min(B.minLon, "Location must be in Bengaluru").max(B.maxLon, "Location must be in Bengaluru");
const lat = z.number().min(B.minLat, "Location must be in Bengaluru").max(B.maxLat, "Location must be in Bengaluru");

export const createReportSchema = z.object({
  lon,
  lat,
  gps_lon: lon,
  gps_lat: lat,
  severity: z.enum(SEVERITIES),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX_CHARS)
    .optional()
    .transform((s) => s || undefined),
  // <user uuid>/<uuid>.<ext>, uploaded by the client to the report-photos bucket.
  photo_path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp)$/)
    .optional(),
});
export type CreateReportInput = z.input<typeof createReportSchema>;

export const voteSchema = z.object({
  report_id: z.uuid(),
  vote: z.union([z.literal(1), z.literal(-1)]),
});
export type VoteInput = z.infer<typeof voteSchema>;
