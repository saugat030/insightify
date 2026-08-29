import React from "react";

// Shared panel wrapper + empty state for the dashboards, so every card on both
// the user and admin pages shares one look.

export function DashboardCard({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

// Shown whenever a panel genuinely has no data yet — better than rendering an
// empty chart that looks broken.
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-white/10 px-4 py-8 text-center">
      <p className="text-xs text-zinc-500">{message}</p>
    </div>
  );
}
