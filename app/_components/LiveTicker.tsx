// app/_components/LiveTicker.tsx
"use client";

import { useEffect, useState } from "react";

export function LiveTicker() {
  // Simulated activity stream
  const activities = [
    { user: "User_882", action: "generated summary for", target: "The Future of AI", time: "2s ago" },
    { user: "Dev_Sarah", action: "extracted tags from", target: "React 19 Docs", time: "5s ago" },
    { user: "Researcher_K", action: "saved", target: "Climate Report 2025", time: "12s ago" },
    { user: "Anon_User", action: "processed", target: "SpaceX Starship Update", time: "18s ago" },
    { user: "Alex_M", action: "analyzed", target: "Next.js Conf Keynote", time: "24s ago" },
    { user: "User_991", action: "organized", target: "Design Systems Guide", time: "30s ago" },
  ];

  // Duplicate for seamless loop
  const tickerItems = [...activities, ...activities];

  return (
    <div className="w-full border-y border-white/5 bg-black/40 backdrop-blur-sm overflow-hidden py-3">
      <div className="flex w-fit animate-marquee items-center gap-16">
        {tickerItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap text-xs font-mono text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500/50 animate-pulse"></span>
            <span className="text-zinc-400 font-semibold">{item.user}</span>
            <span>{item.action}</span>
            <span className="text-white/80 border-b border-white/10">{item.target}</span>
            <span className="ml-2 opacity-50">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
