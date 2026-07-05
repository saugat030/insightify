"use client";
import { Navbar } from "@/app/_components/Navbar";
import PipelineVisualization from "../_components/PipeLineVisualization";

export default function WorkflowPage() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground selection:bg-white/20 font-outfit">
      <div className="noise" />
      <div className="bg-grid fixed inset-0 z-0 opacity-20" />
      <Navbar />

      <main className="relative z-10 pt-32 pb-24">
        <section className="container mx-auto px-6 text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-6 font-oswald">
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
