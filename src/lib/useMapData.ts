"use client";

import { useCallback, useEffect, useState } from "react";
import { REPORTS_REFRESH_MS, type Severity } from "./risk";
import { getSupabase } from "./supabase/client";

export type Spot = { id: number; name: string; lon: number; lat: number };

export type Report = {
  id: string;
  severity: Severity;
  place_name: string | null;
  photo_path: string | null;
  note: string | null;
  created_at: string;
  last_confirmed_at: string;
  lon: number;
  lat: number;
  still_votes: number;
  cleared_votes: number;
};

// DECISION: poll the active_reports view instead of Supabase Realtime. Reports
// have no client-readable RLS policy (reads go through the view), and a 60 s
// refresh is fine for M0.
export function useMapData() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [now, setNow] = useState(() => new Date());

  const refreshReports = useCallback(async () => {
    const { data, error } = await getSupabase().from("active_reports").select("*");
    setNow(new Date());
    if (!error && data) setReports(data as Report[]);
  }, []);

  useEffect(() => {
    getSupabase()
      .from("spot_points")
      .select("id, name, lon, lat")
      .then(({ data }) => data && setSpots(data as Spot[]));
  }, []);

  useEffect(() => {
    refreshReports();
    const tick = () => document.visibilityState === "visible" && refreshReports();
    const timer = setInterval(tick, REPORTS_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refreshReports]);

  return { spots, reports, now, refreshReports };
}
