import ComparisonSlider from "@/app/_components/comparison-slider";
import PricingCard from "@/app/_components/pricing-card";
import { PRICING_TIERS } from "@/constants/constants";

export default function PricingPage() {
  return (
    <main className="relative z-10 pb-24 pt-32">
      <section className="container mx-auto mb-16 px-6 text-center">
        <h1 className="mb-6 font-oswald text-4xl font-bold tracking-tight text-white">
          Stop Managing <br />
          <span className="text-gradient">Digital Clutter.</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-zinc-400">
          The difference between hoarding links and building knowledge is
          structure. See the difference.
        </p>
      </section>

      {/* slider */}
      <section className="container mx-auto mb-32 px-6">
        <ComparisonSlider />
      </section>

      {/* pricing cards */}
      <section className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} />
          ))}
        </div>
      </section>
    </main>
  );
}
