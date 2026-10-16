import { ensureSession } from "./supabase/client";

/** POST JSON to one of our API routes as the (anonymous) signed-in user. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const session = await ensureSession();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Try again.");
  return json as T;
}
