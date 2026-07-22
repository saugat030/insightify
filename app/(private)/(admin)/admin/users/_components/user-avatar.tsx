"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AdminUser } from "./types";

interface UserAvatarProps {
  user: Pick<AdminUser, "username" | "profilePicture">;
  className?: string;
}

function initials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Uses a plain <img> (not next/image) so external Google avatar hosts work
// without configuring next.config remotePatterns. Falls back to initials.
export function UserAvatar({ user, className }: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const showImage = user.profilePicture && !broken;

  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-xs font-semibold",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profilePicture as string}
          alt={user.username}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(user.username)
      )}
    </div>
  );
}
