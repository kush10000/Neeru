"use client";

import type { ReactNode } from "react";

/** Bottom sheet over the map. The map stays visible and interactive above it. */
export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <section
      role="dialog"
      aria-label={typeof title === "string" ? title : undefined}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 max-h-[72vh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl text-gray-500 active:bg-gray-100"
        >
          ×
        </button>
      </div>
      {children}
    </section>
  );
}
