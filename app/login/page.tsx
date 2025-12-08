// app/login/page.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { login, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAuthLoading && user) {
      const from = searchParams.get("from");
      router.push(from || "/dashboard");
    }
  }, [user, isAuthLoading, router, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      await login(email, password);
      const from = searchParams.get("from");
      router.push(from || "/dashboard");
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    }
  };

  // Loading State
  if (isAuthLoading || (!isAuthLoading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="font-mono text-xs text-zinc-500">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-foreground selection:bg-white/20">
      {/* Background FX */}
      <div className="noise" />
      <div className="bg-grid absolute inset-0 opacity-20" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-block">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .75c.799 0 1.571-.059 2.308-.17 1.348-.204 2.651-.621 3.868-1.22l.509-.254.55-.274a7.973 7.973 0 012.525 0l.55.274.509.254a14.394 14.394 0 003.868 1.22c.736.111 1.509.17 2.308.17a.75.75 0 001-.75V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v8.152l-.46.23c-1.222.608-2.673.608-3.895 0l-.46-.23V4.533zM12 14.73a6.45 6.45 0 00-1.954-.954l-1.636-.546a.75.75 0 00-.316 1.41l1.635.546c.55.183 1.13.315 1.725.392v-3.79c0-.414.336-.75.75-.75s.75.336.75.75v3.79c.594-.077 1.174-.21 1.725-.392l1.635-.546a.75.75 0 00-.316-1.41l-1.636.546c-.672.224-1.326.544-1.954.954z" />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Enter your credentials to access your workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/50 p-3 text-white placeholder-zinc-700 outline-none transition-all focus:border-white/30 focus:bg-black"
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/50 p-3 text-white placeholder-zinc-700 outline-none transition-all focus:border-white/30 focus:bg-black"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isAuthLoading}
            className="group mt-6 flex w-full items-center justify-center rounded-lg bg-white py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-70"
          >
            {isAuthLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              "Sign In"
            )}
            <svg
              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-zinc-500">
          First time here?{" "}
          <Link
            href="/register"
            className="font-medium text-white hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
