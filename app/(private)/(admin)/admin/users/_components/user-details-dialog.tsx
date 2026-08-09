"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminUser } from "./types";
import { UserAvatar } from "./user-avatar";

interface UserDetailsDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium break-all">
        {children}
      </span>
    </div>
  );
}

export function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>
            Full account information for this user.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} className="size-12 text-base" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.username}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="grid gap-1">
              <Row label="Role">
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </Row>
              <Row label="Tier">
                <Badge variant={user.tier === "pro" ? "default" : "outline"}>
                  {user.tier}
                </Badge>
              </Row>
              <Row label="Links created">{user.linksCreatedCount ?? 0}</Row>
              <Row label="Sign-in method">
                {user.googleId ? "Google" : "Email & password"}
              </Row>
              <Row label="Joined">{formatDate(user.createdAt)}</Row>
              <Row label="Usage reset">{formatDate(user.lastResetDate)}</Row>
              <Row label="User ID">
                <span className="font-mono text-xs">{user._id}</span>
              </Row>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
