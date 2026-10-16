"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { formatAgo } from "@/lib/risk";
import { SEVERITY_META } from "@/lib/severity";
import { photoUrl } from "@/lib/supabase/client";
import type { Report } from "@/lib/useMapData";
import { SeverityIcon } from "./SeverityIcon";
import { Sheet } from "./Sheet";

export function ReportDetail({
  report,
  now,
  onClose,
  onVoted,
}: {
  report: Report;
  now: Date;
  onClose: () => void;
  onVoted: (message: string) => void;
}) {
  const meta = SEVERITY_META[report.severity];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vote(v: 1 | -1) {
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/votes", { report_id: report.id, vote: v });
      onVoted(v === 1 ? "Thanks for confirming." : "Thanks! Marked as cleared.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={
        <span className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: meta.color }}
          >
            <SeverityIcon severity={report.severity} className="h-5 w-5" />
          </span>
          {meta.label}
        </span>
      }
      onClose={onClose}
    >
      <p className="font-medium">{report.place_name ?? "Unnamed location"}</p>
      <p className="text-sm text-gray-600">
        Reported {formatAgo(report.created_at, now)} · last confirmed {formatAgo(report.last_confirmed_at, now)}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {report.still_votes} still flooded · {report.cleared_votes} cleared
      </p>

      {report.note && <p className="mt-3 rounded-lg bg-gray-100 p-3 text-sm">{report.note}</p>}

      {report.photo_path && (
        // eslint-disable-next-line @next/next/no-img-element -- small user photo from Supabase Storage
        <img
          src={photoUrl(report.photo_path)}
          alt="Photo of the waterlogging"
          loading="lazy"
          className="mt-3 max-h-56 w-full rounded-lg object-cover"
        />
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => vote(1)}
          className="h-12 rounded-xl bg-blue-600 font-semibold text-white active:bg-blue-700 disabled:opacity-60"
        >
          Still flooded
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => vote(-1)}
          className="h-12 rounded-xl border-2 border-gray-300 font-semibold active:bg-gray-100 disabled:opacity-60"
        >
          Cleared
        </button>
      </div>
    </Sheet>
  );
}
