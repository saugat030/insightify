"use client";
import { useState } from "react";
import Link from "next/link";
import { FEATURES_DATA } from "@/constants/constants";

type FeatureKey = keyof typeof FEATURES_DATA;

export function FeaturePrism() {
  const [activeTab, setActiveTab] = useState<FeatureKey>("extract");
  const current = FEATURES_DATA[activeTab];

  return (
    <section className="container mx-auto px-6 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* left */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-8 font-oswald">
            Everything in one <br />
            <span className="text-zinc-500">intelligent prism.</span>
          </h2>
          <div className="space-y-4">
            {(Object.keys(FEATURES_DATA) as FeatureKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full text-left p-6 rounded-xl border transition-all duration-300 group ${activeTab === key ? "bg-white/5 border-white/20" : "bg-transparent border-transparent hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-lg font-semibold ${activeTab === key ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}
                  >
                    {FEATURES_DATA[key].title}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">
                  {FEATURES_DATA[key].desc}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-8 pl-6">
            <Link
              href={current.href}
              className="text-sm font-medium text-white border-b border-white/20 pb-1 hover:border-white transition-colors"
            >
              {current.cta} →
            </Link>
          </div>
        </div>

        {/* right */}
        <div className="h-[500px] w-full rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl overflow-hidden relative">
          {/* mac window chrome — skipped by previews that ship their own */}
          {current.chrome && (
            <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/10 bg-black/20 flex items-center px-4 gap-2 z-10">
              <div className="h-3 w-3 rounded-full bg-red-500/20"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500/20"></div>
              <div className="h-3 w-3 rounded-full bg-green-500/20"></div>
            </div>
          )}
          <div className={`${current.chrome ? "pt-10" : ""} h-full w-full`}>
            {current.preview}
          </div>
        </div>
      </div>
    </section>
  );
}
