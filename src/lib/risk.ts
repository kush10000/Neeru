// Report lifecycle rules and display constants.
// The database `config` table is authoritative for server-side enforcement;
// these mirror it for client UX (pin clamping, fading markers).

export const REPORT_ACTIVE_MINUTES = 120; // config.report_active_minutes
export const HIDE_VOTE_MARGIN = 2; // config.hide_vote_margin
export const MAX_GPS_DISTANCE_M = 500; // config.max_gps_distance_m
export const NOTE_MAX_CHARS = 140;
export const PHOTO_MAX_BYTES = 300 * 1024;

export const MIN_REPORT_OPACITY = 0.35;
export const REPORTS_REFRESH_MS = 60_000;

export type Severity = "ankle" | "knee" | "impassable";
export const SEVERITIES: readonly Severity[] = ["ankle", "knee", "impassable"];

export function minutesSince(iso: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(iso).getTime()) / 60_000);
}

export function isActive(lastConfirmedAt: string, now: Date): boolean {
  return minutesSince(lastConfirmedAt, now) < REPORT_ACTIVE_MINUTES;
}

export function isHiddenByVotes(stillVotes: number, clearedVotes: number): boolean {
  return clearedVotes >= stillVotes + HIDE_VOTE_MARGIN;
}

/** 1.0 when just confirmed, fading linearly to MIN_REPORT_OPACITY at expiry. */
export function reportOpacity(lastConfirmedAt: string, now: Date): number {
  const t = Math.min(1, minutesSince(lastConfirmedAt, now) / REPORT_ACTIVE_MINUTES);
  return 1 - t * (1 - MIN_REPORT_OPACITY);
}

export function formatAgo(iso: string, now: Date): string {
  const m = Math.floor(minutesSince(iso, now));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min ago`;
}
