"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardCard } from "@/app/_components/private/dashboard-card";

export function PasswordCard() {
  const { user, changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Google-only accounts have no password; the API says so too, but there is no
  // point rendering a form they cannot use.
  const googleOnly = !!user?.googleId;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(oldPassword, newPassword);
      setDone(true);
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-sm text-white placeholder-zinc-700 outline-none transition-all focus:border-white/30 focus:bg-black";
  const label = "text-xs font-medium uppercase tracking-wider text-zinc-500";

  return (
    <DashboardCard
      title="Password"
      subtitle={
        googleOnly
          ? "This account signs in with Google."
          : "Changing it signs out your other devices."
      }
    >
      {googleOnly ? (
        <p className="rounded-lg border border-dashed border-white/10 p-4 text-xs text-zinc-500">
          You sign in with Google, so there is no password to change. Google
          manages your credentials.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {error && (
            <p className="rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded border border-emerald-500/20 bg-emerald-500/10 p-2 text-xs text-emerald-400">
              Password updated. Your other devices have been signed out.
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="oldPassword" className={label}>
              Current password
            </label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={field}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className={label}>
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={field}
              placeholder="min 8 characters"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className={label}>
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={field}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-white p-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </DashboardCard>
  );
}
