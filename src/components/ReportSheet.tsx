"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { apiPost } from "@/lib/api";
import type { LonLat } from "@/lib/geo";
import { NOTE_MAX_CHARS, type Severity } from "@/lib/risk";
import { ensureSession, getSupabase } from "@/lib/supabase/client";
import { SeverityPicker } from "./SeverityPicker";
import { Sheet } from "./Sheet";

const PhotoPicker = dynamic(() => import("./PhotoPicker"), { ssr: false });

export default function ReportSheet({
  gps,
  pin,
  onCancel,
  onSubmitted,
}: {
  gps: LonLat;
  pin: LonLat;
  onCancel: () => void;
  onSubmitted: (outcome: "created" | "merged") => void;
}) {
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!severity) return;
    setBusy(true);
    setError(null);
    try {
      const session = await ensureSession();
      let photo_path: string | undefined;
      if (photo) {
        const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await getSupabase()
          .storage.from("report-photos")
          .upload(path, photo, { contentType: "image/jpeg" });
        if (upErr) throw new Error("Photo upload failed. Remove it or try again.");
        photo_path = path;
      }
      const res = await apiPost<{ outcome: "created" | "merged" }>("/api/reports", {
        lon: pin[0],
        lat: pin[1],
        gps_lon: gps[0],
        gps_lat: gps[1],
        severity,
        note: note || undefined,
        photo_path,
      });
      onSubmitted(res.outcome);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet title="How deep is the water?" onClose={onCancel}>
      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        ⚠️ Don&apos;t use your phone while riding. Pull over first.
      </p>

      <SeverityPicker value={severity} onChange={setSeverity} />

      <p className="mt-2 text-xs text-gray-500">Drag the blue pin or tap the map to adjust (within 500 m of you).</p>

      <div className="mt-3">
        {addingPhoto || photo ? (
          <PhotoPicker value={photo} onChange={setPhoto} />
        ) : (
          <button
            type="button"
            onClick={() => setAddingPhoto(true)}
            className="h-11 text-sm font-medium text-blue-700 underline"
          >
            + Add photo (optional)
          </button>
        )}
      </div>

      <label className="mt-2 block text-sm">
        <span className="sr-only">Note (optional)</span>
        <input
          type="text"
          value={note}
          maxLength={NOTE_MAX_CHARS}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional), e.g. left lane blocked"
          className="h-11 w-full rounded-lg border border-gray-300 px-3"
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!severity || busy}
        className="mt-3 h-14 w-full rounded-xl bg-blue-600 text-lg font-semibold text-white active:bg-blue-700 disabled:bg-gray-300"
      >
        {busy ? "Sending…" : severity ? "Send report" : "Pick a depth"}
      </button>
    </Sheet>
  );
}
