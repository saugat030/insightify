// app/_components/NewLinkForm.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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
      const response = await axios.post("/api/links", { url });

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
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-article-url.com"
          className="flex-grow rounded-md border border-gray-300 p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-5 py-3 text-center text-sm font-medium text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400"
        >
          {isLoading ? "Saving..." : "Save Link"}
        </button>
      </div>

      {/* Feedback Messages */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </form>
  );
}
