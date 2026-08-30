"use client";
import { useRef, useState } from "react";

export default function ComparisonSlider() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const moveTo = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  return (
    <div
      className="relative mx-auto h-[400px] w-full max-w-4xl cursor-col-resize select-none overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
      ref={containerRef}
      onMouseMove={(e) => moveTo(e.clientX)}
      onTouchMove={(e) => moveTo(e.touches[0].clientX)}
    >
      {/* right side clean */}
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
        <div className="bg-grid absolute inset-0 opacity-10" />
        <div className="grid grid-cols-2 gap-4 opacity-50 blur-[1px]">
          <div className="h-24 w-40 rounded-lg border border-blue-500/50 bg-blue-500/20" />
          <div className="h-24 w-40 rounded-lg border border-blue-500/50 bg-blue-500/20" />
          <div className="h-24 w-40 rounded-lg border border-blue-500/50 bg-blue-500/20" />
          <div className="h-24 w-40 rounded-lg border border-blue-500/50 bg-blue-500/20" />
        </div>
        <div className="absolute text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          ORDER
        </div>
      </div>

      {/* left side chaos */}
      <div
        className="absolute inset-0 overflow-hidden border-r-2 border-white bg-zinc-950"
        style={{ width: `${sliderPosition}%` }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/10">
          <div className="absolute left-10 top-10 h-16 w-32 rotate-12 rounded border border-red-500/40 bg-red-500/20" />
          <div className="absolute bottom-20 right-20 h-20 w-24 -rotate-6 rounded border border-red-500/40 bg-red-500/20" />
          <div className="absolute left-1/3 top-1/2 h-12 w-12 rotate-45 rounded-full border border-red-500/40 bg-red-500/20" />

          <div className="text-5xl font-bold text-red-500 opacity-80 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            CHAOS
          </div>
        </div>
      </div>

      {/* handle */}
      <div
        className="pointer-events-none absolute bottom-0 top-0 -ml-5 flex w-10 items-center justify-center"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_0_20px_white]">
          <svg
            className="h-4 w-4 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        </div>
      </div>

      {/* labels */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded bg-black/50 px-2 py-1 text-xs text-red-400 backdrop-blur">
        Without Insightify
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 rounded bg-black/50 px-2 py-1 text-xs text-blue-400 backdrop-blur">
        With Insightify
      </div>
    </div>
  );
}
