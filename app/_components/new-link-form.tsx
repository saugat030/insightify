"use client";
import { useState, FormEvent } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useLinksStore } from "@/store/useLinksStore";

export function NewLinkForm() {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Technology");
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addLink = useLinksStore((s) => s.addLink);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // The access token is automatically added by
      // the axios interceptor from our AuthProvider
      const response = await axiosInstance.post("/api/links", { url, category, keyword });

      // Handle success
      setSuccess(`Saved "${response.data.title}"!`);
      setUrl(""); // Clear the input
      setKeyword("");
      setCategory("Technology");

      // Push the new link straight into the shared store so the list updates
      // immediately. router.refresh() used to be here, but it only re-renders
      // Server Components — the list is a client component fetching in an
      // effect, so nothing happened until a manual page reload.
      addLink(response.data);
    } catch (err: unknown) {
      // Handle error — the API sends a specific reason for scrape failures.
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(message || "Failed to save link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-5">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your link here (https://...)"
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:bg-black/60 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all shadow-inner"
            required
            disabled={isLoading}
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:bg-black/60 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all appearance-none shadow-inner"
            disabled={isLoading}
          >
            {["Technology", "Science", "Gaming", "Geography", "Education", "Entertainment", "Health", "Other"].map(cat => (
               <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4 relative flex">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Specific keyword (optional)"
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 pr-32 text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:bg-black/60 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all shadow-inner"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-1.5 top-1.5 bottom-1.5 rounded-lg bg-green-600 px-6 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500 flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
    </form>
  );
}
