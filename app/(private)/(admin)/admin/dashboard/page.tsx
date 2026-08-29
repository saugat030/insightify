"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Link2,
  FileText,
  Radio,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import StatCard from "@/app/_components/private/stats-card";
import { DashboardCard, EmptyState } from "@/app/_components/private/dashboard-card";
import { ActivityChart, BreakdownBars, DailyPoint } from "@/app/_components/private/charts";

// Platform analytics, all computed from real collections by
// /api/admin/analytics. No sample or placeholder figures.

interface AdminAnalytics {
  totals: {
    users: number;
    links: number;
    documents: number;
    encryptedDocuments: number;
    activeSessions: number;
  };
  breakdown: {
    admins: number;
    regularUsers: number;
    proUsers: number;
    freeUsers: number;
    googleUsers: number;
    passwordUsers: number;
    vaultUsers: number;
  };
  signupsOverTime: DailyPoint[];
  linksOverTime: DailyPoint[];
  topCategories: { category: string; count: number }[];
  topTags: { tag: string; count: number }[];
  topUsers: { username: string; email: string; tier?: string; count: number }[];
  recentUsers: {
    _id: string;
    username: string;
    email: string;
    tier?: string;
    role: string;
    createdAt: string;
    googleId?: string;
  }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// A labelled count with a proportion bar, for the composition panel.
function Ratio({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className="shrink-0 font-mono text-xs text-zinc-500">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
        />
      </div>
    </li>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get("/api/admin/analytics");
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error("Failed to load admin analytics", err);
        if (!cancelled)
          setError("Couldn't load platform analytics. Please retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-sm text-red-300">{error || "No data available."}</p>
        </div>
      </div>
    );
  }

  const { totals, breakdown } = data;

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">
            Admin Dashboard
          </h1>
          <p className="text-sm text-zinc-400">
            Platform-wide activity across all users.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          Manage users
        </Link>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={totals.users}
          icon={Users}
          accent="blue"
          hint={`${breakdown.admins} admin${breakdown.admins === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Links extracted"
          value={totals.links}
          icon={Link2}
          accent="cyan"
          hint="Across all accounts"
        />
        <StatCard
          label="Documents"
          value={totals.documents}
          icon={FileText}
          accent="emerald"
          hint={`${totals.encryptedDocuments} encrypted`}
        />
        <StatCard
          label="Active sessions"
          value={totals.activeSessions}
          icon={Radio}
          accent="purple"
          hint="Unexpired refresh tokens"
        />
      </div>

      {/* signups + composition */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardCard
          title="New signups"
          subtitle="Accounts created over the last 30 days"
          className="lg:col-span-2"
        >
          <ActivityChart
            data={data.signupsOverTime}
            color="blue"
            emptyMessage="No new signups in the last 30 days."
          />
        </DashboardCard>

        <DashboardCard
          title="User composition"
          subtitle={`Share of ${totals.users} account${totals.users === 1 ? "" : "s"}`}
        >
          {totals.users === 0 ? (
            <EmptyState message="No users registered yet." />
          ) : (
            <ul className="space-y-3">
              <Ratio
                label="Pro tier"
                value={breakdown.proUsers}
                total={totals.users}
                color="#10b981"
              />
              <Ratio
                label="Google sign-in"
                value={breakdown.googleUsers}
                total={totals.users}
                color="#3b82f6"
              />
              <Ratio
                label="Vault enabled"
                value={breakdown.vaultUsers}
                total={totals.users}
                color="#a855f7"
              />
              <Ratio
                label="Admins"
                value={breakdown.admins}
                total={totals.users}
                color="#f59e0b"
              />
            </ul>
          )}
        </DashboardCard>
      </div>

      {/* extraction volume + categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardCard
          title="Extraction volume"
          subtitle="Links saved platform-wide over the last 30 days"
          className="lg:col-span-2"
        >
          <ActivityChart
            data={data.linksOverTime}
            color="cyan"
            emptyMessage="No links saved in the last 30 days."
          />
        </DashboardCard>

        <DashboardCard title="Top categories" subtitle="Across all saved links">
          <BreakdownBars
            items={data.topCategories.map((c) => ({
              label: c.category,
              count: c.count,
            }))}
            color="cyan"
            emptyMessage="No links saved yet."
          />
        </DashboardCard>
      </div>

      {/* leaderboards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardCard title="Most active users" subtitle="By links saved">
          {data.topUsers.length === 0 ? (
            <EmptyState message="No activity yet." />
          ) : (
            <ul className="space-y-3">
              {data.topUsers.map((u) => (
                <li
                  key={u.email}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-zinc-200">
                      {u.username}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {u.email}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm text-zinc-300">
                    {u.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Top tags" subtitle="Most frequent across the platform">
          <BreakdownBars
            items={data.topTags.map((t) => ({ label: t.tag, count: t.count }))}
            color="purple"
            emptyMessage="Tags appear once links are saved."
          />
        </DashboardCard>

        <DashboardCard
          title="Recent signups"
          subtitle="Newest accounts"
          action={
            <Link
              href="/admin/users"
              className="text-xs text-zinc-400 transition-colors hover:text-white"
            >
              View all
            </Link>
          }
        >
          {data.recentUsers.length === 0 ? (
            <EmptyState message="No users registered yet." />
          ) : (
            <ul className="space-y-3">
              {data.recentUsers.map((u) => (
                <li key={u._id} className="flex items-start gap-2">
                  {u.googleId ? (
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                  ) : (
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-zinc-200">
                      {u.username}
                      {u.role === "admin" && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-400">
                          admin
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {u.googleId ? "Google" : "Password"} ·{" "}
                      {formatDate(u.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
