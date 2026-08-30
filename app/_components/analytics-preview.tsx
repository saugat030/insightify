import Image from "next/image";
import BrowserFrame from "./browser-frame";

export default function AnalyticsPreview({
  className,
}: {
  className?: string;
}) {
  return (
    <BrowserFrame
      tabTitle="Insightify"
      url="insightify.app/dashboard"
      contentClassName="bg-black"
      className={className}
      decorative
    >
      <Image
        src="/assets/dashboard.png"
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover"
      />

      {/* darkening wash so the image sits in the dark theme */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/20" />
      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-sm font-semibold text-white">Analytics Dashboard</p>
        <p className="text-xs text-zinc-400">
          Extraction activity, saved links &amp; usage trends.
        </p>
      </div>
    </BrowserFrame>
  );
}
