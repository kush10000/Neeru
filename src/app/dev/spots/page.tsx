import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpotEditorLoader } from "@/components/dev/SpotEditorLoader";
import { seedSpotsSchema } from "@/lib/seedSpots";

export const dynamic = "force-dynamic"; // re-read spots.json on every load
export const metadata: Metadata = { title: "Spot editor (dev)", robots: { index: false } };

// Local tool for verifying seed spots. 404s outside `pnpm dev`.
export default async function SpotEditorPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const raw = await fs.readFile(path.join(process.cwd(), "supabase", "spots.json"), "utf8");
  const spots = seedSpotsSchema.parse(JSON.parse(raw));
  return <SpotEditorLoader initialSpots={spots} />;
}
