"use client";

import { useAuth } from "@/hooks/useAuth";
import { PasswordCard } from "./_components/password-card";
import { SessionsCard } from "./_components/sessions-card";
import { DashboardCard } from "@/app/_components/private/dashboard-card";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your account and the devices signed in to it.
        </p>
      </div>

      <DashboardCard title="Account">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">
              Username
            </dt>
            <dd className="mt-1 text-sm text-white">{user?.username ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">
              Email
            </dt>
            <dd className="mt-1 text-sm text-white">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">
              Plan
            </dt>
            <dd className="mt-1 text-sm capitalize text-white">
              {user?.tier ?? "free"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">
              Sign-in method
            </dt>
            <dd className="mt-1 text-sm text-white">
              {user?.googleId ? "Google" : "Email and password"}
            </dd>
          </div>
        </dl>
      </DashboardCard>

      <PasswordCard />
      <SessionsCard />
    </div>
  );
}
