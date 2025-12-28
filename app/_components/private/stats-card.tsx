import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { StatData } from "@/types/types";

interface StatCardProps {
  data: StatData;
}

const StatCard: React.FC<StatCardProps> = ({ data }) => {
  const TrendIcon =
    data.trend === "up"
      ? TrendingUp
      : data.trend === "down"
      ? TrendingDown
      : Minus;
  const trendColor =
    data.trend === "up"
      ? "text-emerald-400"
      : data.trend === "down"
      ? "text-rose-400"
      : "text-slate-400";
  const trendBg =
    data.trend === "up"
      ? "bg-emerald-400/10"
      : data.trend === "down"
      ? "bg-rose-400/10"
      : "bg-slate-400/10";

  return (
    <div className="nexus-card p-6 rounded-2xl relative overflow-hidden group">
      {/* Background Glow Effect */}
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500" />

      <div className="flex justify-between items-start relative z-10">
        <div
          className={`p-3 rounded-xl bg-white/5 border border-white/5 ${data.color} group-hover:scale-110 transition-transform duration-300`}
        >
          <data.icon className="w-6 h-6" />
        </div>

        <div
          className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${trendBg} ${trendColor}`}
        >
          <TrendIcon className="w-3 h-3" />
          <span>{Math.abs(data.change)}%</span>
        </div>
      </div>

      <div className="mt-4 relative z-10">
        <h3 className="text-slate-400 text-sm font-medium tracking-wide">
          {data.label}
        </h3>
        <p className="text-2xl font-bold text-white mt-1 font-mono tracking-tight">
          {data.value}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
