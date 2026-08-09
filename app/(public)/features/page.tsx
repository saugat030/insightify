"use client";
import ScannerComponent from "@/app/_components/scanner-component";

export default function FeaturesPage() {
  return (
    <>
      <main className="relative z-10 pt-32 pb-24">
        <section className="container mx-auto px-6 text-center mb-24">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6 font-oswald">
            Command Center for <br />
            <span className="text-gradient">Digital Knowledge.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-zinc-400">
            A suite of precision tools designed to capture, analyze, and retrieve information instantly.
          </p>
        </section>

        <section className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl font-bold text-white mb-4 font-oswald">
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

            <ScannerComponent />
          </div>
        </section>
      </main>
    </>
  );
}
