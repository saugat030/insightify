"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/hooks/useAuth";
import { LinkCard } from "./LinkCard";

// define the type for a Link object
type Link = {
  _id: string;
  url: string;
  title: string;
  imageUrl?: string;
  aiSummary: string[];
  aiTags: string[];
  createdAt: string;
};

export function DashboardClient() {
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { accessToken, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    // Only fetch links if we are no longer in the auth loading state
    // and we have an access token.
    if (!isAuthLoading) {
      if (accessToken) {
        // Fetch the user's links
        const fetchLinks = async () => {
          setIsLoadingLinks(true);
          setError(null);
          try {
            // The access token is automatically added by our axios interceptor
            const response = await axiosInstance.get("/api/links");
            setLinks(response.data);
          } catch (err: any) {
            setError(err.response?.data?.error || "Failed to fetch links.");
          } finally {
            setIsLoadingLinks(false);
          }
        };

        fetchLinks();
      } else {
        // User is not logged in, no need to fetch
        setIsLoadingLinks(false);
      }
    }
  }, [accessToken, isAuthLoading]); // Re-run when auth state changes

  // 1. Show a loading state while auth is being checked
  if (isAuthLoading) {
    return <p>Loading session...</p>;
  }

  // 2. Show a loading state while links are being fetched
  if (isLoadingLinks) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Skeleton Card */}
        <div className="h-64 animate-pulse rounded-2xl bg-white/5 border border-white/5"></div>
        <div className="h-64 animate-pulse rounded-2xl bg-white/5 border border-white/5"></div>
        <div className="h-64 animate-pulse rounded-2xl bg-white/5 border border-white/5"></div>
      </div>
    );
  }

  // 3. Show an error message if fetching failed
  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  // 4. Show a message if there are no links
  if (links.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12">
        <p className="mb-2">You haven't saved any links yet.</p>
        <p className="text-sm">Use the form to add your first resource.</p>
      </div>
    );
  }

  // 5. Show the links in a grid
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <LinkCard key={link._id} link={link} />
      ))}
    </div>
  );
}
