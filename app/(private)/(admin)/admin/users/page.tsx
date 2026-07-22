"use client";

import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { AdminUser } from "./_components/types";
import { UserAvatar } from "./_components/user-avatar";
import { UserFormDialog } from "./_components/user-form-dialog";
import { UserDetailsDialog } from "./_components/user-details-dialog";

const PAGE_SIZES = [10, 25, 50];

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Search + pagination (server-side, offset based)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  // Dialog state
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  // Debounce the search box, and reset to the first page on a new query.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get("/api/admin/users", {
        params: { page, limit, search: debouncedSearch },
      });
      setUsers(res.data.data as AdminUser[]);
      const pg = res.data.pagination;
      setTotal(pg?.total ?? 0);
      setTotalPages(pg?.totalPages ?? 1);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      setError(
        axiosErr.response?.data?.error || "Failed to load users. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, reloadToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Quick inline PATCH for a single field (role or tier) without the dialog.
  const patchUser = useCallback(
    async (id: string, patch: Partial<Pick<AdminUser, "role" | "tier">>) => {
      setUpdatingId(id);
      try {
        const res = await axiosInstance.patch(`/api/admin/users/${id}`, patch);
        const updated = res.data.data as AdminUser;
        setUsers((prev) =>
          prev.map((u) => (u._id === id ? { ...u, ...updated } : u)),
        );
        toast.success("User updated");
      } catch (err) {
        const axiosErr = err as AxiosError<{ error?: string }>;
        toast.error(axiosErr.response?.data?.error || "Update failed");
        reload(); // re-sync the control with the real server state
      } finally {
        setUpdatingId(null);
      }
    },
    [reload],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/api/admin/users/${deleteTarget._id}`);
      toast.success(`Deleted ${deleteTarget.username}`);
      // If we removed the last row on a non-first page, step back a page;
      // otherwise just refetch the current page.
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        reload();
      }
      setDeleteTarget(null);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      toast.error(axiosErr.response?.data?.error || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, users.length, page, reload]);

  const handleSaved = useCallback(
    (saved: AdminUser, mode: "create" | "edit") => {
      if (mode === "edit") {
        setUsers((prev) =>
          prev.map((u) => (u._id === saved._id ? { ...u, ...saved } : u)),
        );
      } else {
        // New users sort to the top (newest first) — jump to page 1 and refetch.
        if (page === 1) reload();
        else setPage(1);
      }
    },
    [page, reload],
  );

  const openCreate = () => {
    setFormMode("create");
    setEditUser(null);
    setFormOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setFormMode("edit");
    setEditUser(u);
    setFormOpen(true);
  };

  const openDetails = (u: AdminUser) => {
    setDetailsUser(u);
    setDetailsOpen(true);
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = (page - 1) * limit + users.length;

  return (
    <div className="p-6 md:p-8 space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
            <UsersIcon className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="text-muted-foreground text-sm">
              Manage accounts, roles, and tiers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={reload}
            title="Refresh"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
          <Button onClick={openCreate}>
            <UserPlus /> Add user
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border bg-card/40">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading users…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw /> Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {debouncedSearch ? "No users match your search." : "No users yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">Links</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = currentUser?._id === u._id;
                const busy = updatingId === u._id;
                return (
                  <TableRow key={u._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {u.username}
                            </span>
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px]">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground truncate text-xs">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Inline role change */}
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) =>
                          patchUser(u._id, { role: v as AdminUser["role"] })
                        }
                        disabled={busy || isSelf}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-[110px]"
                          title={
                            isSelf
                              ? "You cannot change your own role"
                              : undefined
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Inline tier change */}
                    <TableCell>
                      <Select
                        value={u.tier}
                        onValueChange={(v) =>
                          patchUser(u._id, { tier: v as AdminUser["tier"] })
                        }
                        disabled={busy}
                      >
                        <SelectTrigger size="sm" className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="text-center tabular-nums">
                      {u.linksCreatedCount ?? 0}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <MoreHorizontal />
                            )}
                            <span className="sr-only">Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openDetails(u)}>
                            <Eye /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination footer */}
      {!error && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground text-xs">
              {total === 0
                ? "No users"
                : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Rows</span>
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-[72px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-2 text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(1)}
              disabled={loading || page <= 1}
              title="First page"
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              title="Previous page"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
              title="Next page"
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(totalPages)}
              disabled={loading || page >= totalPages}
              title="Last page"
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      <UserFormDialog
        mode={formMode}
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editUser}
        onSaved={handleSaved}
      />

      {/* View details dialog */}
      <UserDetailsDialog
        user={detailsUser}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.username}
              </span>{" "}
              ({deleteTarget?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
