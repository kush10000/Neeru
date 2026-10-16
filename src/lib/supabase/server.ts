import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let admin: SupabaseClient<Database> | null = null;

/** Service-role client. Server routes and /api/jobs/* only. */
export function getAdminClient(): SupabaseClient<Database> {
  admin ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Verifies the `Authorization: Bearer <access token>` header and returns the user id. */
export async function getUserId(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data, error } = await getAdminClient().auth.getUser(token);
  return error ? null : data.user.id;
}
