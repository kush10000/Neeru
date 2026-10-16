import type { Severity } from "@/lib/risk";

// Icons let severity read without relying on colour alone.
export function SeverityIcon({ severity, className = "h-6 w-6" }: { severity: Severity; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    "aria-hidden": true,
  };
  if (severity === "impassable") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M7 12h10" strokeWidth={3} />
      </svg>
    );
  }
  const wave = (y: number) => `M3 ${y}c2-2 4-2 6 0s4 2 6 0 4-2 6 0`;
  return (
    <svg {...common}>
      <path d={wave(18)} />
      {severity === "knee" && <path d={wave(12)} />}
      {severity === "ankle" && <path d="M12 4v8m-3-3 3 3 3-3" />}
      {severity === "knee" && <path d={wave(6)} />}
    </svg>
  );
}
