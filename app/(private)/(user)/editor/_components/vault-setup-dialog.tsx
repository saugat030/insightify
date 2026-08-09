"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  KeyRound,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  TriangleAlert,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
import { generatePassphrase } from "@/lib/vault/crypto";
import { checkStrength, MIN_VAULT_SCORE } from "@/lib/vault/strength";

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-emerald-500",
];

export function VaultSetupDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}) {
  const { setup } = useVault();

  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [warning, setWarning] = useState("");

  // Reset all fields whenever the dialog is opened fresh.
  useEffect(() => {
    if (open) {
      setPassphrase("");
      setConfirm("");
      setShow(false);
      setAcknowledged(false);
      setSubmitting(false);
      setScore(null);
      setWarning("");
    }
  }, [open]);

  // Score the passphrase (debounced) as the user types.
  useEffect(() => {
    if (!passphrase) {
      setScore(null);
      setWarning("");
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const result = await checkStrength(passphrase);
      if (active) {
        setScore(result.score);
        setWarning(result.warning);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [passphrase]);

  const handleGenerate = useCallback(async () => {
    const generated = await generatePassphrase();
    setPassphrase(generated);
    setConfirm(generated);
    setShow(true);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!passphrase) return;
    try {
      await navigator.clipboard.writeText(passphrase);
      toast.success("Passphrase copied to clipboard.");
    } catch {
      toast.error("Couldn't copy — select and copy it manually.");
    }
  }, [passphrase]);

  const strongEnough = score !== null && score >= MIN_VAULT_SCORE;
  const matches = passphrase.length > 0 && passphrase === confirm;
  const canSubmit = strongEnough && matches && acknowledged && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await setup(passphrase);
      toast.success("Vault created and unlocked.");
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error("Vault setup failed", error);
      toast.error("Vault setup failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Set up your vault
          </DialogTitle>
          <DialogDescription>
            Create a vault passphrase to encrypt secrets in your browser before
            they&apos;re ever saved.
          </DialogDescription>
        </DialogHeader>

        {/* The unavoidable warning. */}
        <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
          <TriangleAlert className="h-4 w-4 shrink-0 text-amber-400" />
          <p>
            This unlocks your encrypted secrets. It is{" "}
            <strong>separate from your login password</strong>. We can never see
            it or reset it. <strong>If you forget it, your secrets are
            permanently lost.</strong>
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="vault-pass">Vault passphrase</Label>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Generate a strong passphrase
              </button>
            </div>
            <div className="relative">
              <Input
                id="vault-pass"
                type={show ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="A multi-word phrase you'll remember"
                className="pr-16 font-mono"
                autoComplete="new-password"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy"
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  title={show ? "Hide" : "Show"}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  {show ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Strength meter */}
            {score !== null && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= score ? STRENGTH_COLORS[score] : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-[11px] ${
                    strongEnough ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {STRENGTH_LABELS[score]}
                  {!strongEnough && warning ? ` — ${warning}` : ""}
                  {!strongEnough && !warning
                    ? " — choose something stronger"
                    : ""}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vault-confirm">Confirm passphrase</Label>
            <Input
              id="vault-confirm"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Enter it again"
              className="font-mono"
              autoComplete="new-password"
            />
            {confirm.length > 0 && !matches && (
              <p className="text-[11px] text-red-400">
                Passphrases don&apos;t match.
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-emerald-500"
            />
            <span>
              I understand that if I lose this passphrase, my encrypted secrets
              cannot be recovered by anyone.
            </span>
          </label>
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
            disabled={!canSubmit}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Create vault
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
