import type { Severity } from "./risk";

export const SEVERITY_META: Record<Severity, { label: string; hint: string; color: string }> = {
  ankle: { label: "Ankle-deep", hint: "Slow going", color: "#ca8a04" },
  knee: { label: "Knee-deep", hint: "Two-wheelers stall", color: "#ea580c" },
  impassable: { label: "Impassable", hint: "Avoid this road", color: "#b91c1c" },
};

export const SPOT_COLOR = "#6b7280";
