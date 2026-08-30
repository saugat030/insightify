import Link from "next/link";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export function NeuralHero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      <DottedGlowBackground
        className="pointer-events-none"
        gap={26}
        radius={1.4}
        opacity={0.55}
        color="rgba(255,255,255,0.28)"
        darkColor="rgba(255,255,255,0.28)"
        glowColor="rgba(59,130,246,0.9)"
        darkGlowColor="rgba(59,130,246,0.9)"
        backgroundOpacity={0}
        speedMin={0.25}
        speedMax={1.1}
      />
      {/* fade towards the end */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 35%, rgba(5,5,5,0.85) 75%, #050505 100%)",
        }}
      />

      {/* main content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <h1 className="animate-reveal delay-100 text-6xl md:text-8xl font-bold tracking-tight text-white mb-6 leading-tight font-oswald">
          The <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-purple-400 to-white">External Brain</span> <br />
          for the Internet.
        </h1>

        <p className="animate-reveal delay-200 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
           Insightify connects your scattered bookmarks into a living knowledge graph.
           Powered by Gemini AI, it reads, understands, and organizes the web for you.
        </p>

        <div className="animate-reveal delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
           <Link
              href="/register"
              className="group relative h-12 px-8 flex items-center justify-center rounded-full bg-white text-black font-semibold transition-transform hover:scale-105 active:scale-95"
           >
              Create Account
              <div className="absolute inset-0 -z-10 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
           </Link>
           <Link
              href="/features"
              className="h-12 px-8 flex items-center justify-center rounded-full border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
           >
              Explore Capabilities
           </Link>
        </div>
      </div>
    </section>
  );
}
