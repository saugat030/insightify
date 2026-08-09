"use client";

// VaultProvider — session-scoped state for the Encrypted Secrets Vault.
//
// The derived key lives ONLY in this provider's memory (React state) for the
// duration of the session. It is never written to localStorage (persistent,
// XSS-readable) or cookies (sent to the server). A page refresh clears it by
// design; the user re-enters the passphrase to unlock.
//
// All cryptography is delegated to lib/vault/crypto.ts and runs in the browser.
// This provider talks to the thin /api/vault route only to fetch status and to
// persist the one-time setup material (salt, KDF params, verifier).

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/hooks/useAuth";
import {
  deriveKey,
  encryptString,
  decryptString,
  makeVerifier,
  verifyKey,
  generateSalt,
  defaultKdfParams,
  type CipherBlob,
  type KdfParams,
} from "@/lib/vault/crypto";

interface VaultStatus {
  vaultEnabled: boolean;
  vaultSalt: string | null;
  vaultKdf: KdfParams | null;
  vaultVerifier: CipherBlob | null;
}

interface VaultContextType {
  // Whether the user has completed one-time vault setup.
  isSetup: boolean;
  // Whether the derived key is currently held in memory this session.
  isUnlocked: boolean;
  // Still fetching initial vault status.
  isLoading: boolean;
  // Create the vault (one-time). Derives the key, seals the verifier, and
  // persists only salt + KDF params + verifier. Leaves the vault unlocked.
  setup: (passphrase: string) => Promise<void>;
  // Re-derive the key from a typed passphrase and validate it against the
  // verifier. Returns true on success (vault becomes unlocked), false otherwise.
  unlock: (passphrase: string) => Promise<boolean>;
  // Drop the key from memory.
  lock: () => void;
  // Encrypt/decrypt content with the in-memory key. Throw if locked.
  encryptContent: (plaintext: string) => Promise<CipherBlob>;
  decryptContent: (blob: CipherBlob) => Promise<string>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<VaultStatus>({
    vaultEnabled: false,
    vaultSalt: null,
    vaultKdf: null,
    vaultVerifier: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // The derived key. Held in a ref so it never lands in serialized state or
  // React devtools snapshots; a boolean flag drives re-renders instead.
  const keyRef = useRef<Uint8Array | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Fetch vault status whenever the authenticated user changes. Also clears any
  // in-memory key on logout / user switch so one user's key can't linger.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (authLoading) return;
      if (!user) {
        keyRef.current = null;
        setIsUnlocked(false);
        setStatus({
          vaultEnabled: false,
          vaultSalt: null,
          vaultKdf: null,
          vaultVerifier: null,
        });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await axiosInstance.get("/api/vault");
        if (!cancelled) setStatus(res.data);
      } catch (error) {
        console.error("Failed to load vault status", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const setup = useCallback(async (passphrase: string) => {
    const salt = await generateSalt();
    const kdf = await defaultKdfParams();
    const key = await deriveKey(passphrase, salt, kdf);
    const verifier = await makeVerifier(key);

    // Persist only public/opaque material. Key + passphrase never leave here.
    const res = await axiosInstance.post("/api/vault", {
      vaultSalt: salt,
      vaultKdf: kdf,
      vaultVerifier: verifier,
    });

    keyRef.current = key;
    setIsUnlocked(true);
    setStatus(res.data);
  }, []);

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!status.vaultSalt || !status.vaultKdf || !status.vaultVerifier) {
        return false;
      }
      const key = await deriveKey(
        passphrase,
        status.vaultSalt,
        status.vaultKdf,
      );
      const ok = await verifyKey(status.vaultVerifier, key);
      if (!ok) return false;
      keyRef.current = key;
      setIsUnlocked(true);
      return true;
    },
    [status],
  );

  const lock = useCallback(() => {
    // Best-effort zeroing before dropping the reference.
    if (keyRef.current) keyRef.current.fill(0);
    keyRef.current = null;
    setIsUnlocked(false);
  }, []);

  const encryptContent = useCallback(async (plaintext: string) => {
    if (!keyRef.current) throw new Error("Vault is locked.");
    return encryptString(plaintext, keyRef.current);
  }, []);

  const decryptContent = useCallback(async (blob: CipherBlob) => {
    if (!keyRef.current) throw new Error("Vault is locked.");
    return decryptString(blob, keyRef.current);
  }, []);

  const value: VaultContextType = {
    isSetup: status.vaultEnabled,
    isUnlocked,
    isLoading: isLoading || authLoading,
    setup,
    unlock,
    lock,
    encryptContent,
    decryptContent,
  };

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
};
