"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import { BENGALURU_CENTER } from "@/lib/geo";
import { parseCoordPair, SPOT_SOURCES, type SeedSpot } from "@/lib/seedSpots";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type EditableSpot = SeedSpot & { key: string };

export default function SpotEditor({ initialSpots }: { initialSpots: SeedSpot[] }) {
  const mapRef = useRef<MapRef>(null);
  const [spots, setSpots] = useState<EditableSpot[]>(() =>
    initialSpots.map((s) => ({ ...s, key: crypto.randomUUID() })),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [onlyUnverified, setOnlyUnverified] = useState(false);

  const selected = spots.find((s) => s.key === selectedKey) ?? null;
  const verifiedCount = spots.filter((s) => s.verified).length;
  const listed = onlyUnverified ? spots.filter((s) => !s.verified) : spots;

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(key: string, patch: Partial<SeedSpot>) {
    setSpots((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    setDirty(true);
    setStatus(null);
  }

  function select(spot: EditableSpot, fly = true) {
    setSelectedKey(spot.key);
    setPaste("");
    if (fly) mapRef.current?.flyTo({ center: [spot.lon, spot.lat], zoom: Math.max(mapRef.current.getZoom(), 16) });
  }

  function addAtCentre() {
    const c = mapRef.current?.getCenter();
    const spot: EditableSpot = {
      key: crypto.randomUUID(),
      name: "New spot",
      lon: c?.lng ?? BENGALURU_CENTER[0],
      lat: c?.lat ?? BENGALURU_CENTER[1],
      source: "community",
      notes: "",
      verified: false,
    };
    setSpots((all) => [...all, spot]);
    setDirty(true);
    select(spot, false);
  }

  function remove(key: string) {
    setSpots((all) => all.filter((s) => s.key !== key));
    setSelectedKey(null);
    setDirty(true);
  }

  function applyPaste() {
    if (!selected) return;
    const p = parseCoordPair(paste);
    if (!p) return setStatus("Couldn't read coordinates inside Bengaluru from that text.");
    update(selected.key, { lon: p[0], lat: p[1] });
    mapRef.current?.flyTo({ center: p, zoom: Math.max(mapRef.current.getZoom(), 16) });
    setPaste("");
  }

  async function save() {
    setStatus("Saving…");
    const body = spots.map(({ key: _key, ...s }) => s); // eslint-disable-line @typescript-eslint/no-unused-vars
    let res: Response;
    try {
      res = await fetch("/api/dev/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // The page stays usable after the dev server stops, but saving needs it.
      return setStatus(
        'Save failed: the dev server isn\'t running. Start it with "pnpm dev", then click Save again. Your edits are kept until you close this tab.',
      );
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus(`Save failed: ${json.error ?? res.status}`);
    setDirty(false);
    setStatus(`Saved ${json.saved} spots. Run "pnpm exec supabase db reset" to load them into the local DB.`);
  }

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <div className="relative h-[55dvh] md:h-full md:flex-1">
        <Map
          ref={mapRef}
          mapStyle={MAP_STYLE}
          initialViewState={{ longitude: BENGALURU_CENTER[0], latitude: BENGALURU_CENTER[1], zoom: 11.5 }}
          onClick={() => setSelectedKey(null)}
          style={{ position: "absolute", inset: 0 }}
        >
          <NavigationControl position="top-right" />
          {spots.map((s) => {
            const isSel = s.key === selectedKey;
            return (
              <Marker
                key={s.key}
                longitude={s.lon}
                latitude={s.lat}
                anchor="bottom"
                draggable
                onDragEnd={(e) => update(s.key, { lon: e.lngLat.lng, lat: e.lngLat.lat })}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  select(s, false);
                }}
                style={{ zIndex: isSel ? 2 : 1 }}
              >
                <div className="flex cursor-grab flex-col items-center" title={s.name}>
                  {isSel && (
                    <span className="mb-1 rounded bg-black/80 px-1.5 py-0.5 text-xs whitespace-nowrap text-white">
                      {s.name}
                    </span>
                  )}
                  <span
                    className={`block rounded-full border-2 border-white shadow ${isSel ? "h-6 w-6" : "h-4 w-4"} ${s.verified ? "bg-green-600" : "bg-orange-500"}`}
                  />
                  <span className="h-2 w-0.5 bg-gray-700" />
                </div>
              </Marker>
            );
          })}
        </Map>
        <div className="pointer-events-none absolute top-2 left-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          <span className="text-orange-600">●</span> unverified · <span className="text-green-700">●</span> verified ·
          drag pins to move
        </div>
      </div>

      <aside className="flex min-h-0 flex-1 flex-col border-t bg-white md:w-96 md:flex-none md:border-t-0 md:border-l">
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="font-semibold">Spot editor (dev only)</h1>
              <p className="text-xs text-gray-600">
                {verifiedCount}/{spots.length} verified · target 50–100
              </p>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="h-10 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:bg-gray-300"
            >
              {dirty ? "Save" : "Saved"}
            </button>
          </div>
          {status && <p className="text-xs text-gray-700">{status}</p>}
        </div>

        {selected ? (
          <div className="space-y-2 border-b p-3 text-sm">
            <label className="block">
              <span className="text-xs text-gray-600">Name</span>
              <input
                value={selected.name}
                onChange={(e) => update(selected.key, { name: e.target.value })}
                className="h-10 w-full rounded border px-2"
              />
            </label>
            <div className="flex gap-2">
              <label className="block flex-1">
                <span className="text-xs text-gray-600">Source</span>
                <select
                  value={selected.source}
                  onChange={(e) => update(selected.key, { source: e.target.value as SeedSpot["source"] })}
                  className="h-10 w-full rounded border px-2"
                >
                  {SPOT_SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={selected.verified}
                  onChange={(e) => update(selected.key, { verified: e.target.checked })}
                  className="h-5 w-5"
                />
                Verified
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-gray-600">Notes (e.g. which side of the underpass)</span>
              <input
                value={selected.notes}
                onChange={(e) => update(selected.key, { notes: e.target.value })}
                className="h-10 w-full rounded border px-2"
              />
            </label>
            <div>
              <span className="text-xs text-gray-600">Paste coordinates or a Google Maps / OSM link</span>
              <div className="flex gap-2">
                <input
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPaste()}
                  placeholder="12.9177, 77.6238"
                  className="h-10 min-w-0 flex-1 rounded border px-2"
                />
                <button type="button" onClick={applyPaste} className="h-10 rounded border px-3">
                  Move
                </button>
              </div>
            </div>
            <p className="font-mono text-xs text-gray-600">
              lon {selected.lon.toFixed(6)}, lat {selected.lat.toFixed(6)}
            </p>
            <div className="flex items-center justify-between">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lon}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                Check in Google Maps ↗
              </a>
              <button type="button" onClick={() => remove(selected.key)} className="text-red-700 underline">
                Delete spot
              </button>
            </div>
          </div>
        ) : (
          <p className="border-b p-3 text-sm text-gray-600">Select a pin or a spot below to edit it.</p>
        )}

        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <button type="button" onClick={addAtCentre} className="h-9 rounded border px-3 text-sm">
            + Add spot at map centre
          </button>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={onlyUnverified} onChange={(e) => setOnlyUnverified(e.target.checked)} />
            Unverified only
          </label>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
          {listed.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => select(s)}
                className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-gray-100 ${s.key === selectedKey ? "bg-blue-50" : ""}`}
              >
                <span className={s.verified ? "text-green-700" : "text-orange-500"}>{s.verified ? "✓" : "●"}</span>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
