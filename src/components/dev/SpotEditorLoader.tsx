"use client";

import dynamic from "next/dynamic";
import type { SeedSpot } from "@/lib/seedSpots";

const SpotEditor = dynamic(() => import("./SpotEditor"), {
  ssr: false,
  loading: () => <div className="flex h-dvh items-center justify-center text-gray-500">Loading editor…</div>,
});

export function SpotEditorLoader({ initialSpots }: { initialSpots: SeedSpot[] }) {
  return <SpotEditor initialSpots={initialSpots} />;
}
