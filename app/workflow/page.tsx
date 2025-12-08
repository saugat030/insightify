// app/workflow/page.tsx
"use client";

import { Navbar } from "@/app/_components/Navbar";
import { useState, useEffect } from "react";

export default function WorkflowPage() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground selection:bg-white/20">
      <div className="noise" />
      <div className="bg-grid fixed inset-0 z-0 opacity-20" />
      <Navbar />

      <main className="relative z-10 pt-32 pb-24">
        <section className="container mx-auto px-6 text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-6">
            From Chaos to <br />
            <span className="text-gradient">Structured Insight.</span>
          </h1>
          <p className="max-w-xl mx-auto text-lg text-zinc-400">
            See how a simple URL travels through our intelligent pipeline to become 
            permanently accessible knowledge.
          </p>
        </section>

        {/* WORKFLOW PIPELINE VISUALIZATION */}
        <section className="container mx-auto px-6">
           <PipelineVisualization />
        </section>
      </main>
    </div>
  );
}

function PipelineVisualization() {
  const [activeStep, setActiveStep] = useState(0);

  // Cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 3 ? 0 : prev + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      title: "Input Source",
      description: "You paste a URL from any website, blog, or article.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      title: "Intelligent Scraper",
      description: "We fetch the raw HTML and strip away ads, trackers, and noise.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      title: "Gemini AI Core",
      description: "Google's LLM analyzes the text to generate summaries and tags.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "Knowledge Vault",
      description: "The processed insight is indexed and stored for instant retrieval.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Vertical Connecting Line */}
      <div className="absolute left-[39px] top-0 bottom-0 w-[2px] bg-zinc-800 z-0 hidden md:block"></div>
      
      {/* Moving Signal Packet */}
      <div 
        className="absolute left-[35px] w-[10px] h-[10px] rounded-full bg-blue-500 shadow-[0_0_15px_blue] z-10 transition-all duration-[2000ms] ease-in-out hidden md:block"
        style={{ top: `${activeStep * 160 + 40}px` }} 
      ></div>

      <div className="space-y-12">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isPast = index < activeStep;

          return (
            <div 
              key={index} 
              className={`relative flex flex-col md:flex-row items-center md:items-start gap-8 p-6 rounded-2xl border transition-all duration-500 ${isActive ? "bg-zinc-900/80 border-white/20 shadow-2xl scale-105" : "bg-black/20 border-white/5 opacity-50"}`}
            >
              {/* Icon Bubble */}
              <div 
                className={`relative z-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${isActive ? "border-blue-500 bg-black text-blue-500" : isPast ? "border-green-500 bg-black text-green-500" : "border-zinc-800 bg-black text-zinc-600"}`}
              >
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${isActive ? "text-white" : "text-zinc-500"}`}>
                  {step.title}
                </h3>
                <p className="text-zinc-400">
                  {step.description}
                </p>
                
                {/* Simulated Output (Only for active step) */}
                {isActive && (
                  <div className="mt-4 p-3 rounded bg-black border border-white/10 font-mono text-xs text-green-400 animate-reveal">
                      {index === 0 ? "Detecting URL..." : index === 1 ? "Cleaning HTML structure..." : index === 2 ? "Generating embeddings..." : "Index updated successfully."}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
