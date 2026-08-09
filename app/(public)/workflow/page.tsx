"use client";

import Link from "next/link";
import PipelineVisualization from "@/app/_components/pipeline-visualization";

// Visualises how the three product capabilities actually flow. The detailed
// description of each feature lives on /features — this page is only the map.

// `text` matches each lane's colour in the diagram, so the legend still maps
// onto the pipeline without needing an indicator dot.
const LANES = [
  {
    text: "text-blue-400",
    label: "AI & Extraction",
    detail: "A URL becomes a clean, summarised, tagged entry in your library.",
    href: "/features#ai-extraction",
  },
  {
    text: "text-emerald-400",
    label: "Editor & Vault",
    detail:
      "A note is written, auto-saved and — if you choose — encrypted before it leaves your browser.",
    href: "/features#editor",
  },
  {
    text: "text-purple-400",
    label: "Analytics",
    detail: "Both pipelines feed a single dashboard of trends and usage.",
    href: "/features#analytics",
  },
];

export default function WorkflowPage() {
  return (
    <main className="relative z-10 pb-24 pt-32">
      <section className="container mx-auto mb-12 px-6 text-center">
        <h1 className="mb-6 font-oswald text-4xl font-bold tracking-tight text-white">
          From Chaos to <br />
          <span className="text-gradient">Structured Insight.</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-zinc-400">
          Two pipelines run side by side — one turns any URL into knowledge, the
          other turns your writing into encrypted notes. Both roll up into your
          dashboard.
        </p>
      </section>

      {/* legend */}
      <section className="container mx-auto mb-8 px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {LANES.map((lane) => (
            <Link
              key={lane.label}
              href={lane.href}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              <span
                className={`mb-2 block text-sm font-semibold ${lane.text}`}
              >
                {lane.label}
              </span>
              <p className="text-xs leading-relaxed text-zinc-500">
                {lane.detail}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6">
        <PipelineVisualization />
        <p className="mt-3 text-center text-xs text-zinc-600">
          Drag the cards to explore · scroll to zoom
        </p>
      </section>
    </main>
  );
}
