// app/_components/NewLinkForm.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";

export function NewLinkForm() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // The access token is automatically added by
      // the axios interceptor from our AuthProvider
      const response = await axiosInstance.post("/api/links", { url });

      // Handle success
      setSuccess(`Saved "${response.data.title}"!`);
      setUrl(""); // Clear the input

      // This is key:
      // It tells Next.js to re-fetch the data for this page (in our
      // case, the /dashboard) which will re-run the GET /api/links
      // call in our *next* component.
      router.refresh();
    } catch (err: any) {
      // Handle error
      setError(err.response?.data?.error || "Failed to save link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-article-url.com"
          className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-white placeholder-zinc-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
          required
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-white py-3 text-sm font-bold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Saving...
            </span>
          ) : (
            "Save Link"
          )}
        </button>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
          {success}
        </div>
      )}
    </form>
  );
}
