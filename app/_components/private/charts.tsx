"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "./dashboard-card";

// Charts are pure presentation — every value comes from props, which come from
// the analytics endpoints. Nothing here generates or pads data.

const COLORS = {
  blue: "#3b82f6",
  emerald: "#10b981",
  purple: "#a855f7",
  cyan: "#06b6d4",
} as const;

export type ChartColor = keyof typeof COLORS;

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

// "2026-08-09" -> "Aug 9". Parsed as UTC to match how the API buckets days.
function formatDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ActivityChart({
  data,
  color = "blue",
  emptyMessage = "No activity in this period yet.",
}: {
  data: DailyPoint[];
  color?: ChartColor;
  emptyMessage?: string;
}) {
  const total = data.reduce((sum, p) => sum + p.count, 0);
  if (!data.length || total === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const stroke = COLORS[color];
  const gradientId = `activity-${color}`;

  return (
    <div className="h-full min-h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
            minTickGap={24}
            tickFormatter={formatDay}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(9, 9, 11, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
            }}
            itemStyle={{ color: "#fff" }}
            labelStyle={{ color: "#a1a1aa" }}
            labelFormatter={(label) => formatDay(String(label))}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Count"
            stroke={stroke}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Simple proportional bars — used for category/tag breakdowns where a full
// charting library would be overkill.
export function BreakdownBars({
  items,
  color = "blue",
  emptyMessage = "Nothing to show yet.",
}: {
  items: { label: string; count: number }[];
  color?: ChartColor;
  emptyMessage?: string;
}) {
  if (!items.length) return <EmptyState message={emptyMessage} />;

  const max = Math.max(...items.map((i) => i.count), 1);
  const bar = COLORS[color];

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-zinc-300">{item.label}</span>
            <span className="shrink-0 font-mono text-xs text-zinc-500">
              {item.count}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(4, (item.count / max) * 100)}%`,
                backgroundColor: bar,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
