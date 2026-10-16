"use client";

import { SEVERITIES, type Severity } from "@/lib/risk";
import { SEVERITY_META } from "@/lib/severity";
import { SeverityIcon } from "./SeverityIcon";

export function SeverityPicker({ value, onChange }: { value: Severity | null; onChange: (s: Severity) => void }) {
  return (
    <div role="radiogroup" aria-label="Water depth" className="grid grid-cols-3 gap-2">
      {SEVERITIES.map((s) => {
        const meta = SEVERITY_META[s];
        const selected = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(s)}
            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-sm font-semibold"
            style={
              selected
                ? { backgroundColor: meta.color, borderColor: meta.color, color: "#fff" }
                : { borderColor: meta.color, color: meta.color }
            }
          >
            <SeverityIcon severity={s} className="h-7 w-7" />
            {meta.label}
            <span className={`text-[11px] font-normal ${selected ? "text-white/90" : "text-gray-600"}`}>{meta.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
