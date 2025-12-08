// app/features/page.tsx
"use client";

import { Navbar } from "@/app/_components/Navbar";
import { useState, useEffect } from "react";

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground selection:bg-white/20">
      <div className="noise" />
      <div className="bg-grid fixed inset-0 z-0 opacity-20" />
      <Navbar />

      <main className="relative z-10 pt-32 pb-24">
        {/* Header */}
        <section className="container mx-auto px-6 text-center mb-24">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6">
            Command Center for <br />
            <span className="text-gradient">Digital Knowledge.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-zinc-400">
            A suite of precision tools designed to capture, analyze, and retrieve information instantly.
          </p>
        </section>

        {/* FEATURE 1: CAPTURE & SCAN (The Scanner Component) */}
        <section className="container mx-auto px-6 mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 mb-6">
                <span className="mr-2 h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                AI Extraction Engine
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Reads like a human.<br />
                Processes like a machine.
              </h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Our advanced scraper doesn't just grab HTML. It understands context. 
                Using Gemini AI, it identifies key entities, summarizes core arguments, 
                and tags content automatically.
              </p>
              <ul className="space-y-4">
                {[
                  "Semantic understanding of content",
                  "Automatic noise removal (ads, navs)",
                  "Entity recognition for smart tagging"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-zinc-300">
                    <svg className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual: Scanner Mockup */}
            <ScannerComponent />
          </div>
        </section>

        {/* FEATURE 2: RETRIEVE (Grid Visualization) */}
        <section className="container mx-auto px-6 mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
             {/* Visual: Tag Mesh (Simple CSS visualization) */}
             <div className="relative h-[400px] w-full rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur overflow-hidden">
                <div className="absolute inset-0 bg-grid-small opacity-30"></div>
                
                {/* Floating Tags */}
                <div className="absolute top-1/4 left-1/4 animate-float" style={{animationDelay: '0s'}}>
                  <TagBadge label="#React" color="blue" />
                </div>
                <div className="absolute top-3/4 left-1/3 animate-float" style={{animationDelay: '1s'}}>
                  <TagBadge label="#AI" color="purple" />
                </div>
                <div className="absolute top-1/3 right-1/4 animate-float" style={{animationDelay: '2s'}}>
                  <TagBadge label="#Design" color="pink" />
                </div>
                <div className="absolute bottom-1/4 right-1/3 animate-float" style={{animationDelay: '1.5s'}}>
                  <TagBadge label="#Startups" color="yellow" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                   <div className="h-32 w-32 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md">
                     <span className="text-2xl font-bold text-white">Hub</span>
                   </div>
                </div>
             </div>

             {/* Text Content */}
             <div>
              <div className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-400 mb-6">
                Knowledge Graph
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Connect the dots automatically.
              </h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Forget manual folders. Insightify builds a dynamic knowledge graph 
                based on your saved content. Find connections you didn't know existed.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Sub-components

function TagBadge({ label, color }: { label: string, color: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    pink: "border-pink-500/30 bg-pink-500/10 text-pink-400",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  };
  
  return (
    <span className={`rounded-md border px-3 py-1.5 text-sm font-medium ${colors[color] || colors.blue} shadow-lg backdrop-blur-sm`}>
      {label}
    </span>
  );
}

function ScannerComponent() {
  const [scannedLines, setScannedLines] = useState<number>(0);
  
  // Simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setScannedLines(prev => (prev > 10 ? 0 : prev + 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const codeSnippet = [
    "import { Insightify } from '@core';",
    "const url = 'https://example.com/article';",
    "",
    "async function analyze() {",
    "  const content = await scrape(url);",
    "  const summary = await ai.summarize(content);",
    "  const tags = await ai.extractTags(content);",
    "  ",
    "  return { summary, tags };",
    "}"
  ];

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black p-6 shadow-2xl font-mono text-sm overflow-hidden order-1 lg:order-2">
      {/* Title Bar */}
      <div className="flex items-center gap-2 mb-4 opacity-50 border-b border-white/10 pb-4">
         <div className="h-3 w-3 rounded-full bg-red-500"></div>
         <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
         <div className="h-3 w-3 rounded-full bg-green-500"></div>
         <span className="ml-2 text-xs">analysis_engine.ts</span>
      </div>

      {/* Code Area */}
      <div className="space-y-2 relative">
         {codeSnippet.map((line, i) => (
           <div key={i} className={`transition-colors duration-300 ${i < scannedLines ? "text-green-400" : "text-zinc-600"}`}>
              <span className="mr-4 select-none opacity-30">{i + 1}</span>
              {line}
           </div>
         ))}
         
         {/* Scanning Line */}
         <div 
            className="absolute left-0 right-0 h-[2px] bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] transition-all duration-700 ease-linear"
            style={{ top: `${scannedLines * 28 + 10}px` }} 
         ></div>
      </div>

      {/* Output Log */}
      <div className="mt-8 border-t border-white/10 pt-4">
        <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Analysis Log</div>
        <div className="space-y-1 text-xs">
          {scannedLines > 2 && <div className="text-blue-400">→ URL detected</div>}
          {scannedLines > 5 && <div className="text-yellow-400">→ Content extracted (2.4kb)</div>}
          {scannedLines > 7 && <div className="text-purple-400">→ Tags identified: AI, Web, Dev</div>}
        </div>
      </div>
    </div>
  );
}
