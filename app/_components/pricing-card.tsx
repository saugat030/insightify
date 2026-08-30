import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PricingTier } from "@/types/types";

export default function PricingCard({ tier }: { tier: PricingTier }) {
  const { highlight } = tier;

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-8",
        highlight
          ? "border border-blue-500/50 bg-black shadow-2xl shadow-blue-900/20"
          : "border border-white/10 bg-black/50 backdrop-blur transition-all hover:border-white/20",
      )}
    >
      {tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {tier.badge}
        </div>
      )}

      <h3
        className={cn(
          "font-oswald text-lg font-semibold",
          highlight ? "text-white" : "text-zinc-400",
        )}
      >
        {tier.name}
      </h3>

      <div className="mt-4 flex items-baseline text-white">
        <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
        <span className="ml-1 text-xl text-zinc-500">/mo</span>
      </div>

      <p className="mt-4 text-sm text-zinc-400">{tier.tagline}</p>

      <button
        type="button"
        className={cn(
          "mt-8 w-full rounded-lg py-3 text-sm font-semibold",
          highlight
            ? "bg-white text-black hover:bg-zinc-200"
            : "bg-zinc-800 text-white hover:bg-zinc-700",
        )}
      >
        {tier.cta}
      </button>

      <ul className="mt-8 space-y-4 text-sm text-zinc-300">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-center">
            <Check className="mr-3 h-5 w-5 shrink-0 text-blue-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
