"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLinksStore } from "@/store/useLinksStore";
import { LinkCard } from "./link-card";

export function DashboardClient() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { links, isLoading: isLoadingLinks, error, fetchLinks } = useLinksStore();

  useEffect(() => {
    // Only fetch once auth has settled and we actually have a token.
    if (isAuthLoading) return;
    if (accessToken) {
      fetchLinks();
    } else {
      // not logged in — nothing to load
      useLinksStore.setState({ isLoading: false });
    }
  }, [accessToken, isAuthLoading, fetchLinks]);

  // 1. Show a loading state while auth is being checked
  if (isAuthLoading) {
    return <p className="text-zinc-400">Loading session...</p>;
  }

  if (isLoadingLinks) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* skeleton */}
        <div className="h-64 animate-pulse rounded-2xl bg-white/5 border border-white/5"></div>
        <div className="h-64 animate-pulse rounded-2xl bg-white/5 border border-white/5"></div>
        <div className="h-64 animate-pulse rounded-2xl bg-white/5 border border-white/5"></div>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (links.length === 0) {
    return (
      <div className="text-center text-zinc-400 py-12">
        <p className="mb-2">You haven&apos;t saved any links yet.</p>
        <p className="text-sm">Use the form to add your first resource.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <LinkCard key={link._id} link={link} />
      ))}
    </div>
  );
}
