"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Link2,
  FileText,
  ShieldCheck,
  Gauge,
  ExternalLink,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import StatCard from "@/app/_components/private/stats-card";
import { DashboardCard, EmptyState } from "@/app/_components/private/dashboard-card";
import { ActivityChart, BreakdownBars, DailyPoint } from "@/app/_components/private/charts";

// Every figure on this page comes from /api/analytics, which is computed from
// the Link, MarkdownDoc and User collections. There is no placeholder data —
// panels with nothing to show render an explicit empty state instead.

interface Analytics {
  profile: {
    username: string;
    email: string;
    tier: string;
    vaultEnabled: boolean;
    memberSince: string;
  };
  totals: {
    links: number;
    documents: number;
    encryptedDocuments: number;
    tags: number;
  };
  quota: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
    windowLabel: string;
  };
  linksOverTime: DailyPoint[];
  topTags: { tag: string; count: number }[];
  categories: { category: string; count: number }[];
  recentLinks: {
    _id: string;
    title: string;
    url: string;
    category: string;
    createdAt: string;
  }[];
  recentDocuments: {
    _id: string;
    title: string;
    updatedAt: string;
    encrypted?: boolean;
  }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get("/api/analytics");
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
        if (!cancelled) setError("Couldn't load your dashboard. Please retry.");
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

  const { profile, totals, quota } = data;

  return (
    <div className="space-y-6 p-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-400">
            Welcome back, {profile.username}. Member since{" "}
            {formatDate(profile.memberSince)}.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium capitalize text-zinc-300">
          {profile.tier} plan
        </span>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saved links"
          value={totals.links}
          icon={Link2}
          accent="blue"
          hint="Extracted and summarised by AI"
        />
        <StatCard
          label="Documents"
          value={totals.documents}
          icon={FileText}
          accent="emerald"
          hint={`${totals.encryptedDocuments} encrypted`}
        />
        <StatCard
          label="Vault"
          value={profile.vaultEnabled ? "Enabled" : "Not set up"}
          icon={ShieldCheck}
          accent={profile.vaultEnabled ? "emerald" : "zinc"}
          hint={
            profile.vaultEnabled
              ? "Notes encrypted in your browser"
              : "Turn it on from the editor"
          }
        />
        <StatCard
          label={`Links left this ${quota.windowLabel}`}
          value={`${quota.remaining} / ${quota.limit}`}
          icon={Gauge}
          accent={quota.remaining === 0 ? "amber" : "cyan"}
          hint={`Resets ${formatDate(quota.resetsAt)}`}
        />
      </div>

      {/* activity + breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardCard
          title="Extraction activity"
          subtitle="Links saved over the last 30 days"
          className="lg:col-span-2"
        >
          <ActivityChart
            data={data.linksOverTime}
            color="blue"
            emptyMessage="No links saved in the last 30 days."
          />
        </DashboardCard>

        <DashboardCard title="Categories" subtitle="How your links break down">
          <BreakdownBars
            items={data.categories.map((c) => ({
              label: c.category,
              count: c.count,
            }))}
            color="cyan"
            emptyMessage="Save a link to see categories."
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardCard title="Top tags" subtitle="Most frequent AI-generated tags">
          <BreakdownBars
            items={data.topTags.map((t) => ({ label: t.tag, count: t.count }))}
            color="purple"
            emptyMessage="Tags appear once you save links."
          />
        </DashboardCard>

        {/* recent links */}
        <DashboardCard
          title="Recent links"
          subtitle="Your latest extractions"
          action={
            <Link
              href="/links"
              className="text-xs text-zinc-400 transition-colors hover:text-white"
            >
              View all
            </Link>
          }
        >
          {data.recentLinks.length === 0 ? (
            <EmptyState message="You haven't saved any links yet." />
          ) : (
            <ul className="space-y-3">
              {data.recentLinks.map((link) => (
                <li key={link._id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2"
                  >
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-blue-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-zinc-200 transition-colors group-hover:text-white">
                        {link.title}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {link.category} · {formatDate(link.createdAt)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* recent documents */}
        <DashboardCard
          title="Recent documents"
          subtitle="Most recently edited"
          action={
            <Link
              href="/editor"
              className="text-xs text-zinc-400 transition-colors hover:text-white"
            >
              Open editor
            </Link>
          }
        >
          {data.recentDocuments.length === 0 ? (
            <EmptyState message="No documents yet." />
          ) : (
            <ul className="space-y-3">
              {data.recentDocuments.map((doc) => (
                <li key={doc._id} className="flex items-start gap-2">
                  {doc.encrypted ? (
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-zinc-200">
                      {doc.title}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {doc.encrypted ? "Encrypted · " : ""}
                      {formatDate(doc.updatedAt)}
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
