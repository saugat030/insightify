"use client";

import { useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useLinksStore } from "@/store/useLinksStore";

type Link = {
  _id: string;
  url: string;
  title: string;
  imageUrl?: string;
  aiSummary: string[];
  aiTags: string[];
  category?: string;
  keyword?: string;
  aiExtraInfo?: string;
  createdAt: string;
};

interface LinkCardProps {
  link: Link;
}

export function LinkCard({ link }: LinkCardProps) {
  const removeLink = useLinksStore((s) => s.removeLink);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this link?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await axiosInstance.delete(`/api/links/${link._id}`);
      // Drop it from the shared store so the card disappears right away.
      // router.refresh() did nothing here for the same reason as in
      // NewLinkForm: the list is client-side and fetches in an effect.
      removeLink(link._id);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(message || "Failed to delete link.");
      setIsDeleting(false);
    }
  };
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-cyan-500/10 hover:-translate-y-1">
      {/* Optional Image Header */}
      {link.imageUrl ? (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative h-48 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
          <img
            src={link.imageUrl}
            alt={link.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => (e.currentTarget.style.display = "none")} // Hide broken images
          />
          
          {/* Category Badge over image */}
          {link.category && (
             <div className="absolute top-4 left-4 z-20">
               <span className="inline-flex items-center rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/10 shadow-lg">
                 {link.category}
               </span>
             </div>
          )}
        </a>
      ) : (
        /* Category Badge if no image */
        link.category && (
           <div className="pt-5 px-6">
             <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
               {link.category}
             </span>
           </div>
        )
      )}

      <div className="flex flex-col flex-1 p-6">
        {/* Title and URL */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-6"
        >
          <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-cyan-400 line-clamp-2 leading-snug">
            {link.title}
          </h3>
          <p className="truncate text-sm font-mono text-zinc-500 group-hover:text-zinc-400">
            {link.url}
          </p>
        </a>

        {/* AI Summary */}
        <div className="mb-6 space-y-4 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Key Insights
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <ul className="space-y-3">
            {link.aiSummary.map((point, index) => {
              // Highlight the keyword if present
              let renderedPoint: React.ReactNode = point;
              if (link.keyword && link.keyword.trim() !== "") {
                 const regex = new RegExp(`(${link.keyword})`, "gi");
                 const parts = point.split(regex);
                 renderedPoint = parts.map((part, i) => 
                   regex.test(part) ? <strong key={i} className="text-cyan-300 bg-cyan-500/10 px-1 py-0.5 rounded-md font-semibold">{part}</strong> : part
                 );
              }
              return (
                <li
                  key={index}
                  className="text-sm text-slate-300 leading-relaxed flex items-start gap-3"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <span>{renderedPoint}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Extra Info */}
        {link.aiExtraInfo && (
           <div className="mb-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/20 p-4 shadow-inner relative overflow-hidden">
             {/* decorative blur */}
             <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-500/20 blur-2xl rounded-full" />
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Deep Dive</span>
               </div>
               <p className="text-sm text-purple-100/80 leading-relaxed">
                 {link.aiExtraInfo}
               </p>
             </div>
           </div>
        )}

        {/* AI Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-white/5">
          {link.aiTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-default border border-white/5"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute right-4 top-4 z-30 rounded-full bg-black/60 p-2 text-white/70 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white disabled:opacity-50 opacity-0 group-hover:opacity-100 shadow-lg"
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

        {error && <p className="mt-3 text-sm text-red-400 font-medium bg-red-500/10 p-2 rounded-lg">{error}</p>}
      </div>
    </div>
  );
}
