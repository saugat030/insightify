// app/page.tsx
import { Navbar } from "@/app/_components/Navbar";
import { NeuralHero } from "@/app/_components/NeuralHero";
import { FeaturePrism } from "@/app/_components/FeaturePrism";
import { LiveTicker } from "@/app/_components/LiveTicker";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-white/20">
      {/* Background Texture */}
      <div className="noise" />
      <div className="bg-grid fixed inset-0 z-0 opacity-20" />

      {/* Ticker & Header */}
      <div className="fixed top-0 z-50 w-full">
        <LiveTicker />
        <Navbar />
      </div>

      <main className="relative z-10 pt-[100px]">
        {/* HERO */}
        <NeuralHero />

        {/* INTERACTIVE FEATURES */}
        <FeaturePrism />

        {/* CTA FOOTER */}
        <section className="container mx-auto pb-24 pt-12 text-center">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 px-6 py-24 backdrop-blur-xl">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-5xl font-bold tracking-tight text-white mb-6">
                Build your <br />
                <span className="text-zinc-500">Second Brain.</span>
              </h2>
              <p className="text-xl text-zinc-400 mb-10 max-w-lg">
                Stop losing context. Start connecting dots. Insightify is free
                for early adopters.
              </p>
              <Link
                href="/register"
                className="inline-flex h-14 min-w-[200px] items-center justify-center rounded-full bg-white px-8 text-lg font-semibold text-black transition-all hover:bg-zinc-200 hover:scale-105"
              >
                Get Started Now
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/5 bg-black py-12">
          <div className="container mx-auto px-6 flex flex-col items-center justify-between gap-6 md:flex-row">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} Insightify Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-zinc-500">
              <a href="#" className="hover:text-white transition-colors">
                Twitter
              </a>
              <a href="#" className="hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Discord
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
