"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AxiosError } from "axios";

// separate the logic into a standalone component
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { login, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAuthLoading && user) {
      const from = searchParams.get("from");
      user.role === "admin"
        ? router.push(from || "/admin/dashboard")
        : router.push(from || "/dashboard");
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
      const user = await login(email, password);
      const from = searchParams.get("from");
      if (user.role === "admin") {
        router.push(from || "/admin/dashboard");
      } else {
        router.push(from || "/dashboard");
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.message || "An unknown error occurred.");
    }
  };

  // reusing your loading state logic
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
      <div className="noise" />
      <div className="bg-grid absolute inset-0 opacity-40" />

      <div className="relative z-10 w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-block"></Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Enter your credentials to access your workspace.
          </p>
        </div>

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

// define a loading fallback for the suspense boundary
function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <p className="font-mono text-xs text-zinc-500">LOADING...</p>
      </div>
    </div>
  );
}

// export the page component wrapping the form in suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
