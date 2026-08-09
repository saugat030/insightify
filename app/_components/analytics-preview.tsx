// Preview for the Analytics Dashboard feature.
//
// TODO: this stock image is the only placeholder left — swap it for a real
// screenshot of the dashboard. Drop the file in /public/assets and change the
// src below to e.g. "/assets/dashboard-preview.png" (nothing else needs to
// change).
//
// Uses a plain <img> (not next/image) so the external host works without adding
// remotePatterns to next.config — same approach as user-avatar.tsx.

export default function AnalyticsPreview() {
  return (
    <div aria-hidden="true" className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://picsum.photos/seed/insightify-analytics/1200/800"
        alt=""
        className="h-full w-full object-cover opacity-60"
      />

      {/* darkening wash so the image sits in the dark theme */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/20" />

      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-sm font-semibold text-white">Analytics Dashboard</p>
        <p className="text-xs text-zinc-400">
          Extraction activity, saved links &amp; usage trends.
        </p>
      </div>
    </div>
  );
}
