"use client";

import { useEffect, useState } from "react";
import { PHOTO_MAX_BYTES } from "@/lib/risk";

/**
 * Picks a photo and re-encodes it as JPEG through a canvas, which drops EXIF
 * (including GPS) and shrinks it to ≤300 KB. The compression library is only
 * downloaded when a photo is actually chosen.
 */
export default function PhotoPicker({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return setPreview(null);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { default: compress } = await import("browser-image-compression");
      const out = await compress(file, {
        maxSizeMB: (PHOTO_MAX_BYTES * 0.95) / (1024 * 1024),
        maxWidthOrHeight: 1280,
        fileType: "image/jpeg",
        preserveExif: false,
        useWebWorker: false, // the worker build loads the library from a CDN
      });
      if (out.size > PHOTO_MAX_BYTES) throw new Error("too big");
      onChange(out);
    } catch {
      setError("Couldn't process that photo. Try another one.");
    } finally {
      setBusy(false);
    }
  }

  if (value && preview) {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
        <img src={preview} alt="Selected photo" className="h-16 w-16 rounded-lg object-cover" />
        <button type="button" onClick={() => onChange(null)} className="h-11 text-sm text-red-700 underline">
          Remove photo
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="flex h-11 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-700">
        {busy ? "Compressing…" : "Choose or take a photo"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
