"use client";
import { STATS } from "@/constants/constants";
import StatCard from "@/app/_components/private/stats-card";
import { RevenueChart } from "@/app/_components/private/charts";
import RecentActivity from "@/app/_components/private/recent-activity";
import { Zap } from "lucide-react";

// This page is automatically protected by our middleware.
// We don't need any special auth checks here.
export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Welcome Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Dashboard <span className="text-cyan-400">.</span>
          </h1>
          <p className="text-slate-400">
            Welcome back, Admin. Here's what's happening today.
          </p>
        </div>

        <div className="hidden md:flex items-center space-x-2 bg-nexus-800/50 backdrop-blur border border-white/10 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium font-mono">
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat) => (
          <StatCard key={stat.id} data={stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        <div className="lg:col-span-2 h-full">
          <RevenueChart />
        </div>
        <div className="lg:col-span-1 h-full">
          <RecentActivity />
        </div>
      </div>

      {/* Promo/Extra Section */}
      <div className="nexus-card rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-purple-600/20 to-cyan-600/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              <Zap className="w-5 h-5 text-yellow-400 mr-2 fill-yellow-400" />
              Pro Feature Unlocked
            </h3>
            <p className="text-slate-400 max-w-lg">
              You have access to advanced neural analytics. The AI model is
              currently processing data at 99.9% efficiency.
            </p>
          </div>
          <button className="mt-4 md:mt-0 px-6 py-2.5 bg-white text-nexus-900 font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            View Report
          </button>
        </div>
      </div>
    </div>
  );
}
