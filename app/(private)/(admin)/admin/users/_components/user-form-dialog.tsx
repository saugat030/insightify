"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import axiosInstance from "@/lib/axiosInstance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminUser } from "./types";

interface UserFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AdminUser | null;
  onSaved: (user: AdminUser, mode: "create" | "edit") => void;
}

interface FormState {
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
  tier: "free" | "pro";
}

const emptyForm: FormState = {
  username: "",
  email: "",
  password: "",
  role: "user",
  tier: "free",
};

export function UserFormDialog({
  mode,
  open,
  onOpenChange,
  user,
  onSaved,
}: UserFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the dialog opens (or the target user changes).
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && user) {
      setForm({
        username: user.username,
        email: user.email,
        password: "",
        role: user.role,
        tier: user.tier,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, user]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.username.trim() || !form.email.trim()) {
      setError("Username and email are required.");
      return;
    }
    if (mode === "create" && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "edit" && form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await axiosInstance.post("/api/admin/users", {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          tier: form.tier,
        });
        // POST returns the created user object directly.
        onSaved(res.data as AdminUser, "create");
        toast.success("User created");
      } else if (user) {
        const payload: Record<string, string> = {
          username: form.username.trim(),
          email: form.email.trim(),
          role: form.role,
          tier: form.tier,
        };
        if (form.password) payload.password = form.password;

        const res = await axiosInstance.put(
          `/api/admin/users/${user._id}`,
          payload,
        );
        // PUT returns { success, message, data }.
        onSaved(res.data.data as AdminUser, "edit");
        toast.success("User updated");
      }
      onOpenChange(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      const message =
        axiosErr.response?.data?.error ||
        `Failed to ${mode === "create" ? "create" : "update"} user.`;
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add new user" : "Edit user"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Create a new account and assign its role and tier."
                : "Update this user's details, role, or tier."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              placeholder="jane_doe"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="jane@example.com"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">
              Password{" "}
              {mode === "edit" && (
                <span className="text-muted-foreground font-normal">
                  (leave blank to keep current)
                </span>
              )}
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => update("role", v as "admin" | "user")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tier</Label>
              <Select
                value={form.tier}
                onValueChange={(v) => update("tier", v as "free" | "pro")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Create user" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
