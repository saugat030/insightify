import React from "react";
import { MoreHorizontal } from "lucide-react";
import { TRANSACTIONS } from "@/constants/constants";

const RecentActivity: React.FC = () => {
  return (
    <div className="nexus-card p-6 rounded-2xl h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Recent Transactions
        </h2>
        <button className="text-slate-500 hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {TRANSACTIONS.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
          >
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={tx.avatar}
                  alt={tx.user}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-nexus-900 group-hover:ring-cyan-500/50 transition-all"
                />
                <div
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-nexus-900 ${
                    tx.status === "Completed"
                      ? "bg-emerald-400"
                      : tx.status === "Pending"
                      ? "bg-amber-400"
                      : "bg-rose-400"
                  }`}
                />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                  {tx.user}
                </h4>
                <p className="text-xs text-slate-500">{tx.date}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-mono font-bold text-white">
                {tx.amount}
              </p>
              <p
                className={`text-[10px] uppercase tracking-wider font-semibold ${
                  tx.status === "Completed"
                    ? "text-emerald-400"
                    : tx.status === "Pending"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {tx.status}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 py-2 text-xs font-medium text-slate-400 hover:text-white border border-white/5 hover:bg-white/5 rounded-lg transition-all">
        View All Transactions
      </button>
    </div>
  );
};

export default RecentActivity;
