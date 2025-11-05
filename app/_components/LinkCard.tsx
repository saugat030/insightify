// app/_components/LinkCard.tsx
"use client";

import { useState } from "react";
import axios from "axios";
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
      await axios.delete(`/api/links/${link._id}`);

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
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* Optional Image Header */}
      {link.imageUrl && (
        <a href={link.url} target="_blank" rel="noopener noreferrer">
          <img
            src={link.imageUrl}
            alt={link.title}
            className="h-40 w-full object-cover"
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
          className="group"
        >
          <h3 className="mb-1 text-lg font-bold text-gray-900 group-hover:text-blue-600">
            {link.title}
          </h3>
          <p className="mb-3 truncate text-sm text-gray-500 group-hover:text-blue-500">
            {link.url}
          </p>
        </a>

        {/* AI Summary */}
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
            AI Summary
          </h4>
          <ul className="list-inside list-disc space-y-1">
            {link.aiSummary.map((point, index) => (
              <li key={index} className="text-sm text-gray-700">
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* AI Tags */}
        <div className="flex flex-wrap items-center gap-2">
          {link.aiTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white/70 backdrop-blur-sm transition-all hover:bg-red-600 hover:text-white disabled:opacity-50"
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

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
