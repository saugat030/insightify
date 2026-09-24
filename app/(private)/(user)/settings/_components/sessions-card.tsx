"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Monitor, LogOut } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/hooks/useAuth";
import { DashboardCard, EmptyState } from "@/app/_components/private/dashboard-card";

interface Session {
  family: string;
  device: string;
  signedInAt: string;
  lastActiveAt: string;
  expiresAt: string;
  current: boolean;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function SessionsCard() {
  const { logout, logoutAll } = useAuth();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/auth/sessions");
      setSessions(res.data.sessions);
    } catch {
      setError("Could not load your sessions.");
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (session: Session) => {
    setBusy(session.family);
    setError(null);
    try {
      await axiosInstance.delete("/api/auth/sessions", {
        data: { family: session.family },
      });
      // Revoking the session you are in ends it — log out rather than
      // leaving the page half-authenticated.
      if (session.current) {
        await logout();
        return;
      }
      await load();
    } catch {
      setError("Could not revoke that session.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardCard
      title="Active sessions"
      subtitle="Every device signed in to this account."
      action={
        sessions && sessions.length > 1 ? (
          <button
            onClick={logoutAll}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-500/30 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out everywhere
          </button>
        ) : undefined
      }
    >
      {error && (
        <p className="mb-3 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {sessions === null ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState message="No active sessions found." />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.family}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {s.device}
                    {s.current && (
                      <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Signed in {when(s.signedInAt)} · last active{" "}
                    {when(s.lastActiveAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => revoke(s)}
                disabled={busy === s.family}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
              >
                {busy === s.family
                  ? "Revoking…"
                  : s.current
                    ? "Sign out"
                    : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
        A revoked device stops working within 15 minutes, when its access token
        expires. Signing out everywhere takes effect immediately.
      </p>
    </DashboardCard>
  );
}
