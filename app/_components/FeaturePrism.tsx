"use client";
import { useState } from "react";
import Link from "next/link";
import PipeLineVisualization from "./PipeLineVisualization";

export function FeaturePrism() {
  const [activeTab, setActiveTab] = useState<"scan" | "flow" | "notes">("scan");

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
            <PipeLineVisualization />
        )
      },
      // 2. Replaced 'graph' with the new Translation & Export feature
      notes: {
        title: "Translate & Export",
        desc: "Translate any Markdown notes instantly. Save them securely in your vault or extract them as a PDF for future reference.",
        color: "emerald",
        preview: (
<div className="relative h-full w-full p-6 flex flex-col gap-4">
                {/* Editor Toolbar */}
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <div className="flex gap-3">
                       <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded">notes.md</span>
                       <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">Preview</span>
                    </div>
                    <button className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 transition-colors text-black px-3 py-1.5 rounded flex items-center gap-2">
                        ↓ Export PDF
                    </button>
                </div>
                
                {/* Split Screen Editor Area */}
                <div className="flex-1 grid grid-cols-2 gap-6 mt-2">
                    {/* Left: Original Markdown (Code) */}
                    <div className="font-mono text-[12px] leading-relaxed text-zinc-500 space-y-1 border-r border-white/5 pr-4">
                        <p className="text-emerald-400"># Project Roadmap</p>
                        <br />
                        <p className="text-zinc-300">**Goals for Q3:**</p>
                        <p>- Optimize Vector DB queries</p>
                        <p>- Implement new translation</p>
                        <br />
                        <p className="text-zinc-600">{">"} Focus on latency.</p>
                    </div>
                    
                    {/* Right: Rendered UI (Visual) */}
                    <div className="font-sans text-zinc-300 space-y-3">
                        <h1 className="text-lg font-bold text-white tracking-tight border-b border-white/10 pb-1">
                            Project Roadmap
                        </h1>
                        <p className="text-[13px] font-semibold text-white">
                            Goals for Q3:
                        </p>
                        <ul className="list-disc list-inside text-[13px] text-zinc-400 space-y-1 marker:text-emerald-500">
                            <li>Optimize Vector DB queries</li>
                            <li>Implement new translation</li>
                        </ul>
                        <blockquote className="border-l-2 border-emerald-500 pl-3 text-[13px] italic text-zinc-500 mt-2">
                            "Focus on latency."
                        </blockquote>
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
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
           <h2 className="text-3xl font-bold text-white mb-8 font-oswald">
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
                       {/* Note: In Tailwind, dynamic template literals like `bg-${color}-500` can sometimes be purged. 
                           If the dots don't show colors, replace this with a standard mapping object or safe-list the colors. */}
                       {activeTab === key && <span className={`h-2 w-2 rounded-full bg-${features[key].color}-500 shadow-[0_0_10px_currentColor]`}></span>}
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">
                       {features[key].desc}
                    </p>
                 </button>
              ))}
           </div>
           
           <div className="mt-8 pl-6">
              {/* 3. Updated the Link logic to point to a 'tools' or 'notes' route for the final tab */}
              <Link href={`/${activeTab === 'scan' ? 'features' : activeTab === 'flow' ? 'workflow' : 'tools'}`} className="text-sm font-medium text-white border-b border-white/20 pb-1 hover:border-white transition-colors">
                 Explore {features[activeTab].title.replace(" (Free)", "")} →
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