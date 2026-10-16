"use client";

import dynamic from "next/dynamic";

// MapLibre needs `window`, so the map renders only in the browser.
// `dynamic(..., { ssr: false })` must be called from a client component.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#e8eef2] text-gray-500">Loading map…</div>
  ),
});

export function MapLoader() {
  return <MapView />;
}
