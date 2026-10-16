"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection } from "geojson";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { BENGALURU_BBOX as B, BENGALURU_CENTER, circleRing, clampToRadius, inBengaluru, type LonLat } from "@/lib/geo";
import { MAX_GPS_DISTANCE_M, reportOpacity } from "@/lib/risk";
import { SEVERITY_META, SPOT_COLOR } from "@/lib/severity";
import { useMapData, type Report, type Spot } from "@/lib/useMapData";
import { ReportDetail } from "./ReportDetail";
import { SeverityIcon } from "./SeverityIcon";
import { Sheet } from "./Sheet";

// Only needed once someone taps "Report", so keep it out of the initial bundle.
const ReportSheet = dynamic(() => import("./ReportSheet"), { ssr: false });

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAX_BOUNDS: [number, number, number, number] = [B.minLon - 0.1, B.minLat - 0.1, B.maxLon + 0.1, B.maxLat + 0.1];

type Mode =
  | { kind: "browse" }
  | { kind: "locating" }
  | { kind: "reporting"; gps: LonLat; pin: LonLat };

type Selection = { kind: "report"; id: string } | { kind: "spot"; spot: Spot } | null;

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { spots, reports, now, refreshReports } = useMapData();
  const [mode, setMode] = useState<Mode>({ kind: "browse" });
  const [selection, setSelection] = useState<Selection>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 4000);
  };

  // GeoJSON for the grey known-spot layer (drawn by MapLibre on the GPU, cheap for many points).
  const spotsGeoJson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: spots.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
        properties: { id: s.id },
      })),
    }),
    [spots],
  );

  const allowedArea = useMemo<Feature | null>(
    () =>
      mode.kind === "reporting"
        ? {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [circleRing(mode.gps, MAX_GPS_DISTANCE_M)] },
            properties: {},
          }
        : null,
    [mode],
  );

  const selectedReport =
    selection?.kind === "report" ? reports.find((r) => r.id === selection.id) : undefined;

  function startReport() {
    setSelection(null);
    if (!("geolocation" in navigator)) return showToast("Your browser can't share location.");
    setMode({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps: LonLat = [pos.coords.longitude, pos.coords.latitude];
        if (!inBengaluru(gps)) {
          setMode({ kind: "browse" });
          return showToast("Reporting only works inside Bengaluru.");
        }
        setMode({ kind: "reporting", gps, pin: gps });
        mapRef.current?.flyTo({ center: gps, zoom: 16, padding: { bottom: 320, top: 0, left: 0, right: 0 } });
      },
      (err) => {
        setMode({ kind: "browse" });
        showToast(
          err.code === err.PERMISSION_DENIED
            ? "Location is needed to report. Allow it in your browser settings."
            : "Couldn't get your location. Try again outdoors.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  function movePin(to: LonLat) {
    if (mode.kind !== "reporting") return;
    setMode({ ...mode, pin: clampToRadius(mode.gps, to, MAX_GPS_DISTANCE_M) });
  }

  function onMapClick(e: MapLayerMouseEvent) {
    if (mode.kind === "reporting") return movePin([e.lngLat.lng, e.lngLat.lat]);
    const spotId = e.features?.[0]?.properties?.id;
    const spot = spots.find((s) => s.id === spotId);
    setSelection(spot ? { kind: "spot", spot } : null);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: BENGALURU_CENTER[0], latitude: BENGALURU_CENTER[1], zoom: 11.5 }}
        maxBounds={MAX_BOUNDS}
        minZoom={10}
        interactiveLayerIds={["spots"]}
        onClick={onMapClick}
        attributionControl={{ compact: true }}
        style={{ position: "absolute", inset: 0 }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source id="spots" type="geojson" data={spotsGeoJson}>
          <Layer
            id="spots"
            type="circle"
            paint={{
              "circle-color": SPOT_COLOR,
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 15, 9],
              "circle-stroke-color": "#fff",
              "circle-stroke-width": 1.5,
              "circle-opacity": 0.8,
            }}
          />
        </Source>

        {allowedArea && (
          <Source id="allowed" type="geojson" data={allowedArea}>
            <Layer id="allowed-fill" type="fill" paint={{ "fill-color": "#2563eb", "fill-opacity": 0.08 }} />
            <Layer id="allowed-line" type="line" paint={{ "line-color": "#2563eb", "line-dasharray": [2, 2] }} />
          </Source>
        )}

        {reports.map((r) => (
          <ReportMarker
            key={r.id}
            report={r}
            opacity={reportOpacity(r.last_confirmed_at, now)}
            selected={r.id === selectedReport?.id}
            onSelect={() => mode.kind === "browse" && setSelection({ kind: "report", id: r.id })}
          />
        ))}

        {mode.kind === "reporting" && (
          <Marker
            longitude={mode.pin[0]}
            latitude={mode.pin[1]}
            anchor="bottom"
            draggable
            onDragEnd={(e) => movePin([e.lngLat.lng, e.lngLat.lat])}
          >
            <div className="flex flex-col items-center" aria-label="Report location, drag to adjust">
              <div className="h-9 w-9 rounded-full border-4 border-white bg-blue-600 shadow-lg" />
              <div className="-mt-1 h-3 w-1 rounded bg-blue-600" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Top bar: name + mandatory disclaimer */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 p-2 pr-14">
        <div className="pointer-events-auto inline-block max-w-full rounded-xl bg-white/90 px-3 py-1.5 shadow">
          <p className="text-sm font-semibold">Neeru · Bengaluru waterlogging</p>
          <p className="text-[11px] leading-tight text-gray-600">
            Community reports + rainfall estimates. Not an official source.
          </p>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="absolute inset-x-4 bottom-28 z-30 mx-auto max-w-sm rounded-xl bg-gray-900/90 px-4 py-3 text-center text-sm text-white"
        >
          {toast}
        </div>
      )}

      {mode.kind !== "reporting" && !selection && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={startReport}
            disabled={mode.kind === "locating"}
            className="pointer-events-auto h-16 rounded-full bg-blue-600 px-8 text-lg font-semibold text-white shadow-xl active:bg-blue-700 disabled:opacity-70"
          >
            {mode.kind === "locating" ? "Finding you…" : "＋ Report water"}
          </button>
        </div>
      )}

      {mode.kind === "reporting" && (
        <ReportSheet
          gps={mode.gps}
          pin={mode.pin}
          onCancel={() => setMode({ kind: "browse" })}
          onSubmitted={(outcome) => {
            setMode({ kind: "browse" });
            showToast(outcome === "merged" ? "Thanks! Added as a confirmation of a nearby report." : "Thanks! Report added.");
            refreshReports();
          }}
        />
      )}

      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          now={now}
          onClose={() => setSelection(null)}
          onVoted={(msg) => {
            showToast(msg);
            refreshReports();
          }}
        />
      )}

      {selection?.kind === "spot" && (
        <Sheet title={selection.spot.name} onClose={() => setSelection(null)}>
          <p className="text-sm text-gray-600">Known flood-prone spot. No live report pinned here right now.</p>
        </Sheet>
      )}
    </div>
  );
}

function ReportMarker({
  report,
  opacity,
  selected,
  onSelect,
}: {
  report: Report;
  opacity: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = SEVERITY_META[report.severity];
  return (
    <Marker
      longitude={report.lon}
      latitude={report.lat}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onSelect();
      }}
    >
      <button
        type="button"
        aria-label={`${meta.label} water${report.place_name ? ` at ${report.place_name}` : ""}`}
        className="flex h-11 w-11 items-center justify-center"
        style={{ opacity }}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-white shadow-md ${selected ? "border-black" : "border-white"}`}
          style={{ backgroundColor: meta.color }}
        >
          <SeverityIcon severity={report.severity} className="h-5 w-5" />
        </span>
      </button>
    </Marker>
  );
}
