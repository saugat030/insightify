// app/_components/LinkCard.tsx
"use client";

import { useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useRouter } from "next/navigation"; // <-- FIX: 'from' not 'in'

// Define the type for a Link object, matching our API/model
type Link = {
  _id: string;
  url: string;
  title: string;
  imageUrl?: string;
  aiSummary: string[];
  aiTags: string[];
  createdAt: string;
};

interface LinkCardProps {
  link: Link;
}

export function LinkCard({ link }: LinkCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this link?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      // The access token is automatically added by our axios interceptor
      await axiosInstance.delete(`/api/links/${link._id}`);

      // Refresh the dashboard's data to remove this card
      router.refresh();
    } catch (err: any) {
      // <-- FIX: Removed stray 'S'
      setError(err.response?.data?.error || "Failed to delete link.");
      setIsDeleting(false);
    }
  };

  // ... (rest of the return JSX is the same)
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-nexus-900/30 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-nexus-900/50">
      {/* Optional Image Header */}
      {link.imageUrl && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-nexus-900/80 to-transparent opacity-60" />
          <img
            src={link.imageUrl}
            alt={link.title}
            className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => (e.currentTarget.style.display = "none")} // Hide broken images
          />
        </a>
      )}

      <div className="p-5">
        {/* Title and URL */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-4"
        >
          <h3 className="mb-1 text-lg font-bold text-white transition-colors group-hover:text-cyan-400 line-clamp-2">
            {link.title}
          </h3>
          <p className="truncate text-xs font-mono text-zinc-500 group-hover:text-zinc-400">
            {link.url}
          </p>
        </a>

        {/* AI Summary */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              AI Summary
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <ul className="space-y-1.5">
            {link.aiSummary.map((point, index) => (
              <li
                key={index}
                className="text-sm text-slate-400 leading-relaxed flex items-start gap-2"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500/50" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* AI Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/5">
          {link.aiTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-400"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white/50 backdrop-blur-md transition-all hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 opacity-0 group-hover:opacity-100"
          title="Delete link"
        >
          {/* Simple X icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
