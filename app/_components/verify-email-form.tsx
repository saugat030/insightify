"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";

const RESEND_COOLDOWN_SECONDS = 60;

// Shared by the register and login pages: both can land a user here, either
// straight after signing up or after a 403 on an unverified account.
export function VerifyEmailForm({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
}) {
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(email, code);
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    try {
      await resendOtp(email);
      setNotice("A new code is on its way.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    }
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white font-oswald">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          We sent a 6-digit code to{" "}
          <span className="text-zinc-300">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            {notice}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="otp"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Verification code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-white/10 bg-black/50 p-3 text-center text-2xl tracking-[0.5em] text-white placeholder-zinc-700 outline-none transition-all focus:border-white/30 focus:bg-black"
            placeholder="000000"
            autoFocus
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-white p-3 font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-zinc-500 transition-colors hover:text-white"
          >
            Use a different email
          </button>
        )}
      </div>
    </div>
  );
}
