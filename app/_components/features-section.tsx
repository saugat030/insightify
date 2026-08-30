import { ACCENTS } from "@/constants/constants";
import { Check } from "lucide-react";
type Accent = keyof typeof ACCENTS;

export default function FeatureSection({
  id,
  eyebrow,
  accent,
  heading,
  body,
  points,
  preview,
  flip = false,
}: {
  id: string;
  eyebrow: string;
  accent: Accent;
  heading: React.ReactNode;
  body: string;
  points: string[];
  preview: React.ReactNode;
  flip?: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <section id={id} className="container mx-auto scroll-mt-32 px-6 py-20">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* copy */}
        <div className={flip ? "order-2" : "order-2 lg:order-1"}>
          <span
            className={`mb-3 block text-xs font-semibold uppercase tracking-widest ${a.text}`}
          >
            {eyebrow}
          </span>

          <h2 className="mb-4 font-oswald text-3xl font-bold text-white">
            {heading}
          </h2>
          <p className="mb-8 leading-relaxed text-zinc-400">{body}</p>

          <ul className="space-y-4">
            {points.map((item) => (
              <li key={item} className="flex items-start text-zinc-300">
                <Check className={`mr-3 mt-0.5 h-5 w-5 shrink-0 ${a.bullet}`} />
                <span className="text-[15px] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* preview */}
        <div className={flip ? "order-1" : "order-1 lg:order-2"}>{preview}</div>
      </div>
    </section>
  );
}