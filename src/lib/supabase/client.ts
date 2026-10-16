import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | null = null;

/** Browser Supabase client (anon key, session in localStorage). */
export function getSupabase(): SupabaseClient<Database> {
  client ??= createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}

// DECISION: sign in anonymously lazily (first report or vote), not on page load.
// Most visitors only look at the map, and Supabase rate-limits anonymous
// sign-ups per IP, which matters behind mobile-carrier NAT.
export async function ensureSession(): Promise<Session> {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  const { data: signedIn, error } = await sb.auth.signInAnonymously();
  if (error || !signedIn.session) throw new Error("Couldn't start a session. Check your connection and try again.");
  return signedIn.session;
}

export function photoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-photos/${path}`;
}
