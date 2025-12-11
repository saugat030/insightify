// app/pricing/page.tsx
"use client";

import { Navbar } from "@/app/_components/Navbar";
import { useState, useRef, useEffect } from "react";

export default function PricingPage() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground selection:bg-white/20">
      <div className="noise" />
      <div className="bg-grid fixed inset-0 z-0 opacity-20" />
      <Navbar />

      <main className="relative z-10 pt-32 pb-24">
        <section className="container mx-auto px-6 text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-6">
            Stop Managing <br />
            <span className="text-gradient">Digital Clutter.</span>
          </h1>
          <p className="max-w-xl mx-auto text-lg text-zinc-400">
            The difference between hoarding links and building knowledge is structure.
            See the difference.
          </p>
        </section>

        {/* COMPARISON VISUALIZATION */}
        <section className="container mx-auto px-6 mb-32">
           <ComparisonSlider />
        </section>

        {/* PRICING CARDS */}
        <section className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Free Tier */}
             <div className="group relative rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur hover:border-white/20 transition-all">
                <h3 className="text-lg font-semibold text-zinc-400">Starter</h3>
                <div className="mt-4 flex items-baseline text-white">
                   <span className="text-4xl font-bold tracking-tight">$0</span>
                   <span className="ml-1 text-xl text-zinc-500">/mo</span>
                </div>
                <p className="mt-4 text-sm text-zinc-400">Perfect for casual researchers.</p>
                <button className="mt-8 w-full rounded-lg bg-zinc-800 py-3 text-sm font-semibold text-white hover:bg-zinc-700">Get Started</button>
                <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                   <li className="flex items-center"><CheckIcon /> 50 Links / month</li>
                   <li className="flex items-center"><CheckIcon /> Basic AI Summaries</li>
                   <li className="flex items-center"><CheckIcon /> 7-day retention</li>
                </ul>
             </div>

             {/* Pro Tier (Highlighted) */}
             <div className="group relative rounded-2xl border border-blue-500/50 bg-black p-8 shadow-2xl shadow-blue-900/20">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wide">
                   Most Popular
                </div>
                <h3 className="text-lg font-semibold text-white">Pro</h3>
                <div className="mt-4 flex items-baseline text-white">
                   <span className="text-4xl font-bold tracking-tight">$12</span>
                   <span className="ml-1 text-xl text-zinc-500">/mo</span>
                </div>
                <p className="mt-4 text-sm text-zinc-400">For serious knowledge builders.</p>
                <button className="mt-8 w-full rounded-lg bg-white py-3 text-sm font-semibold text-black hover:bg-zinc-200">Start Free Trial</button>
                <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                   <li className="flex items-center"><CheckIcon /> Unlimited Links</li>
                   <li className="flex items-center"><CheckIcon /> Advanced Gemini 1.5 Pro</li>
                   <li className="flex items-center"><CheckIcon /> Permanent Graph Storage</li>
                   <li className="flex items-center"><CheckIcon /> API Access</li>
                </ul>
             </div>

             {/* Enterprise Tier */}
             <div className="group relative rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur hover:border-white/20 transition-all">
                <h3 className="text-lg font-semibold text-zinc-400">Team</h3>
                <div className="mt-4 flex items-baseline text-white">
                   <span className="text-4xl font-bold tracking-tight">$49</span>
                   <span className="ml-1 text-xl text-zinc-500">/mo</span>
                </div>
                <p className="mt-4 text-sm text-zinc-400">For collaborative research.</p>
                <button className="mt-8 w-full rounded-lg bg-zinc-800 py-3 text-sm font-semibold text-white hover:bg-zinc-700">Contact Sales</button>
                <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                   <li className="flex items-center"><CheckIcon /> Shared Workspaces</li>
                   <li className="flex items-center"><CheckIcon /> Admin Usage Controls</li>
                   <li className="flex items-center"><CheckIcon /> SSO & Security Audit</li>
                </ul>
             </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Icons
function CheckIcon() {
  return (
    <svg className="mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Comparison Slider Component
function ComparisonSlider() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
     if (!containerRef.current) return;
     const rect = containerRef.current.getBoundingClientRect();
     const touch = e.touches[0];
     const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
     const percentage = (x / rect.width) * 100;
     setSliderPosition(percentage);
  };

  return (
    <div 
      className="relative mx-auto h-[400px] w-full max-w-4xl cursor-col-resize overflow-hidden rounded-2xl border border-white/20 shadow-2xl select-none"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* RIGHT SIDE (The "Clean" Side - Background) */}
      <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
         <div className="absolute inset-0 bg-grid opacity-10"></div>
         {/* Clean Content */}
         <div className="grid grid-cols-2 gap-4 opacity-50 blur-[1px]">
            <div className="h-24 w-40 rounded-lg bg-blue-500/20 border border-blue-500/50"></div>
            <div className="h-24 w-40 rounded-lg bg-blue-500/20 border border-blue-500/50"></div>
            <div className="h-24 w-40 rounded-lg bg-blue-500/20 border border-blue-500/50"></div>
            <div className="h-24 w-40 rounded-lg bg-blue-500/20 border border-blue-500/50"></div>
         </div>
         <div className="absolute text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            ORDER
         </div>
      </div>

      {/* LEFT SIDE (The "Chaos" Side - Overlay) */}
      <div 
        className="absolute inset-0 bg-red-950/20s bg-zinc-950 overflow-hidden border-r-2 border-white"
        style={{ width: `${sliderPosition}%` }}
      >
         <div className="absolute inset-0 flex items-center justify-center bg-red-900/10">
            {/* Chaotic Content */}
            <div className="absolute top-10 left-10 h-16 w-32 rotate-12 rounded bg-red-500/20 border border-red-500/40"></div>
            <div className="absolute bottom-20 right-20 h-20 w-24 -rotate-6 rounded bg-red-500/20 border border-red-500/40"></div>
            <div className="absolute top-1/2 left-1/3 h-12 w-12 rotate-45 rounded-full bg-red-500/20 border border-red-500/40"></div>
            
            <div className="text-5xl font-bold text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] opacity-80">
               CHAOS
            </div>
         </div>
      </div>

      {/* Slider Handle */}
      <div 
         className="absolute top-0 bottom-0 w-[40px] -ml-[20px] flex items-center justify-center pointer-events-none"
         style={{ left: `${sliderPosition}%` }}
      >
         <div className="h-8 w-8 rounded-full bg-white shadow-[0_0_20px_white] flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
         </div>
      </div>
      
      {/* Labels */}
      <div className="absolute bottom-4 left-4 rounded bg-black/50 px-2 py-1 text-xs text-red-400 backdrop-blur pointer-events-none">Without Insightify</div>
      <div className="absolute bottom-4 right-4 rounded bg-black/50 px-2 py-1 text-xs text-blue-400 backdrop-blur pointer-events-none">With Insightify</div>

    </div>
  );
}
