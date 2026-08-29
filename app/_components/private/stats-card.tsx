import React from "react";
import { LucideIcon } from "lucide-react";

// A single headline number.
//
// Deliberately has no trend/percentage indicator: we don't store historical
// snapshots, so any "+12.5% vs last month" would be invented. Show the figure
// and, where useful, a factual `hint` derived from real data.

const ACCENTS = {
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  purple: "text-purple-400",
  cyan: "text-cyan-400",
  amber: "text-amber-400",
  zinc: "text-zinc-400",
} as const;

export type StatAccent = keyof typeof ACCENTS;

export default function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "zinc",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: StatAccent;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between">
        <div
          className={`rounded-xl border border-white/5 bg-white/5 p-3 ${ACCENTS[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium tracking-wide text-zinc-400">
          {label}
        </h3>
        <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-white">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </div>
    </div>
  );
}
