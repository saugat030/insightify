// app/_components/FeaturePrism.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export function FeaturePrism() {
  const [activeTab, setActiveTab] = useState<"scan" | "flow" | "graph">("scan");

  const features = {
    scan: {
      title: "AI & Extraction",
      desc: "Instant analysis of any URL. We strip the noise and find the signal.",
      color: "blue",
      preview: (
        <div className="relative h-full w-full bg-black/50 p-6 font-mono text-xs text-zinc-400 overflow-hidden">
           <div className="text-zinc-600 border-b border-white/10 pb-2 mb-4 flex justify-between">
              <span>scanner_v2.ts</span>
              <span className="text-green-500">Active</span>
           </div>
           <div className="space-y-2">
              <div className="text-blue-400">{">"} initiating_sequence(url)</div>
              <div className="text-zinc-500">... connecting to source</div>
              <div className="text-green-400">{">"} creating_embeddings...</div>
              <div className="pl-4 border-l border-white/10">
                 <div>tags: ["AI", "LLM", "Future"]</div>
                 <div>sentiment: 0.98</div>
                 <div>summary_len: 124 words</div>
              </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent"></div>
        </div>
      )
    },
    flow: {
        title: "Workflow",
        desc: "A seamless pipeline from clipboard to permanent knowledge vault.",
        color: "purple",
        preview: (
            <div className="relative h-full w-full flex items-center justify-center">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                        <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg>
                    </div>
                    <div className="h-[2px] w-8 bg-zinc-800 relative">
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-2 w-2 rounded-full bg-purple-500 animate-marquee" style={{animationDuration: '2s'}}></div>
                    </div>
                    <div className="h-12 w-12 rounded-lg border border-purple-500/50 bg-purple-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                </div>
            </div>
        )
      },
      graph: {
        title: "Order",
        desc: "Turn scattered links into a structured graph of connected ideas.",
        color: "orange",
        preview: (
            <div className="relative h-full w-full p-6">
                <div className="absolute inset-0 bg-grid opacity-10"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full border border-orange-500/30 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_10px_orange]"></div>
                </div>
                <div className="absolute top-1/3 left-1/3 h-2 w-2 rounded-full bg-zinc-600"></div>
                <div className="absolute top-2/3 right-1/4 h-2 w-2 rounded-full bg-zinc-600"></div>
                <svg className="absolute inset-0 w-full h-full opacity-20">
                    <line x1="50%" y1="50%" x2="33%" y2="33%" stroke="orange" strokeWidth="1" />
                    <line x1="50%" y1="50%" x2="75%" y2="66%" stroke="orange" strokeWidth="1" />
                </svg>
            </div>
        )
     }
  };

  const current = features[activeTab];

  return (
    <section className="container mx-auto px-6 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Tab Controller */}
        <div>
           <h2 className="text-3xl font-bold text-white mb-8">
              Everything in one <br />
              <span className="text-zinc-500">intelligent prism.</span>
           </h2>
           <div className="space-y-4">
              {(Object.keys(features) as Array<keyof typeof features>).map((key) => (
                 <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`w-full text-left p-6 rounded-xl border transition-all duration-300 group ${activeTab === key ? "bg-white/5 border-white/20" : "bg-transparent border-transparent hover:bg-white/5"}`}
                 >
                    <div className="flex items-center justify-between mb-2">
                       <span className={`text-lg font-semibold ${activeTab === key ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                          {features[key].title}
                       </span>
                       {activeTab === key && <span className={`h-2 w-2 rounded-full bg-${features[key].color}-500 shadow-[0_0_10px_currentColor]`}></span>}
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">
                       {features[key].desc}
                    </p>
                 </button>
              ))}
           </div>
           
           <div className="mt-8 pl-6">
              <Link href={`/${activeTab === 'scan' ? 'features' : activeTab === 'flow' ? 'workflow' : 'pricing'}`} className="text-sm font-medium text-white border-b border-white/20 pb-1 hover:border-white transition-colors">
                 Explore {features[activeTab].title} →
              </Link>
           </div>
        </div>

        {/* Right: Interactive Preview */}
        <div className="h-[500px] w-full rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl overflow-hidden relative">
           {/* Window Controls */}
           <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/10 bg-black/20 flex items-center px-4 gap-2 z-10">
              <div className="h-3 w-3 rounded-full bg-red-500/20"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500/20"></div>
              <div className="h-3 w-3 rounded-full bg-green-500/20"></div>
           </div>
           
           {/* Content Area */}
           <div className="pt-10 h-full w-full">
              {current.preview}
           </div>
        </div>
      </div>
    </section>
  );
}
