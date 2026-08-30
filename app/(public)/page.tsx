import { NeuralHero } from "@/app/_components/neural-hero";
import { FeaturePrism } from "@/app/_components/feature-prism";
import CTALanding from "../_components/cta-landing";

export default function HomePage() {
  return (
    <>
      <main className="relative z-10 pt-24">
        <NeuralHero />
        <FeaturePrism />
        <CTALanding />
      </main>
    </>
  );
}
