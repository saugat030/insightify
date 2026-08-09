"use client";

import { useState, useEffect } from "react";
import { LockKeyhole, Eye, EyeOff, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVault } from "@/hooks/useVault";

export function VaultUnlockDialog({
  open,
  onOpenChange,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: () => void;
}) {
  const { unlock } = useVault();

  const [passphrase, setPassphrase] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPassphrase("");
      setShow(false);
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!passphrase || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      // The check happens entirely in the browser against the sealed verifier —
      // the server is never asked whether the passphrase is correct.
      const ok = await unlock(passphrase);
      if (ok) {
        onOpenChange(false);
        onUnlocked?.();
      } else {
        setError("Incorrect passphrase.");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Unlock failed", err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-cyan-400" />
            Unlock your vault
          </DialogTitle>
          <DialogDescription>
            Enter your vault passphrase to decrypt this document. It stays in
            memory for this session only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="unlock-pass">Vault passphrase</Label>
          <div className="relative">
            <Input
              id="unlock-pass"
              type={show ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Your vault passphrase"
              className="pr-10 font-mono"
              autoComplete="off"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
              title={show ? "Hide" : "Show"}
            >
              {show ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!passphrase || submitting}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Unlocking…
              </>
            ) : (
              "Unlock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
