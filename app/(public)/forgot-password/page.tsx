"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const { forgotPassword, resetPassword } = useAuth();
  const router = useRouter();

  // "request" asks for the address; "reset" takes the code and new password.
  const [stage, setStage] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await forgotPassword(email);
      setStage("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email, code, newPassword);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg border border-white/10 bg-black/50 p-3 text-white placeholder-zinc-700 outline-none transition-all focus:border-white/30 focus:bg-black";
  const labelCls =
    "text-xs font-medium uppercase tracking-wider text-zinc-500";

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center">
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white font-oswald">
            {stage === "request" ? "Reset your password" : "Check your email"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {stage === "request"
              ? "We'll email you reset instructions."
              : `We've emailed ${email}.`}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {stage === "reset" && (
          <p className="mb-5 rounded border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-zinc-400">
            If that account has a password, the email contains a 6-digit code —
            enter it below. If it signs in with Google there is no code:{" "}
            <Link href="/login" className="text-white hover:underline">
              continue with Google
            </Link>
            .
          </p>
        )}

        {stage === "request" ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className={labelCls}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
                placeholder="name@example.com"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-white p-3 font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className={labelCls}>
                Reset code
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${field} text-center text-2xl tracking-[0.5em]`}
                placeholder="000000"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="newPassword" className={labelCls}>
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={field}
                placeholder="•••••••• (min 8 chars)"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-white p-3 font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Updating…" : "Set new password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("request");
                setCode("");
                setError(null);
              }}
              className="w-full text-sm text-zinc-500 transition-colors hover:text-white"
            >
              Use a different email
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-zinc-500">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
