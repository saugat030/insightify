"use client";
import PipelineVisualization from "@/app/_components/pipeline-visualization";

export default function WorkflowPage() {
  return (
    <>
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

        <section className="container mx-auto px-6">
           <PipelineVisualization />
        </section>
      </main>
    </>
  );
}
