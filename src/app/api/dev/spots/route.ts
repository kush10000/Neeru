import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderSeedSql, seedSpotsSchema } from "@/lib/seedSpots";

export const runtime = "nodejs";

// Dev-only: writes seed files into the repo. Never available in production.
const SPOTS_JSON = path.join(process.cwd(), "supabase", "spots.json");
const SEED_SQL = path.join(process.cwd(), "supabase", "seed.sql");

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });

  const parsed = seedSpotsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: `${issue?.path.join(".")}: ${issue?.message}` }, { status: 400 });
  }

  await fs.writeFile(SPOTS_JSON, JSON.stringify(parsed.data, null, 2) + "\n");
  await fs.writeFile(SEED_SQL, renderSeedSql(parsed.data));
  return NextResponse.json({ saved: parsed.data.length });
}
