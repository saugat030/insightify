import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";

// Encrypted Secrets Vault — server side.
//
// This route is a DUMB PASS-THROUGH. It authenticates the JWT and stores/returns
// the opaque vault fields (salt, KDF params, verifier). It performs NO crypto and
// never receives the passphrase or derived key. All of that stays in the browser
// (see lib/vault/crypto.ts and hooks/useVault.tsx).

function authUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const payload: AccessTokenPayload | null = verifyAccessToken(token);
  return payload?.userId ?? null;
}

// GET — return the current user's vault status and the public material the
// browser needs to derive and self-verify the key.
export async function GET(req: NextRequest) {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDb();

    const user = await User.findById(userId).select(
      "vaultEnabled vaultSalt vaultKdf vaultVerifier",
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        vaultEnabled: !!user.vaultEnabled,
        vaultSalt: user.vaultSalt ?? null,
        vaultKdf: user.vaultKdf ?? null,
        vaultVerifier: user.vaultVerifier ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[VAULT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST — one-time vault setup. Persists the salt, KDF params, and verifier
// produced in the browser. Rejects if the vault is already enabled (setup is not
// re-runnable, since re-deriving from a new passphrase would orphan existing
// encrypted entries).
export async function POST(req: NextRequest) {
  try {
    const userId = authUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDb();

    const user = await User.findById(userId).select(
      "vaultEnabled vaultSalt vaultKdf vaultVerifier",
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.vaultEnabled) {
      return NextResponse.json(
        { error: "Vault is already set up." },
        { status: 409 },
      );
    }

    const body = await req.json();
    const { vaultSalt, vaultKdf, vaultVerifier } = body ?? {};

    // Validate shape only — never inspect meaning. The server cannot and must
    // not understand these values.
    const validSalt = typeof vaultSalt === "string" && vaultSalt.length > 0;
    const validKdf =
      vaultKdf &&
      typeof vaultKdf.opsLimit === "number" &&
      typeof vaultKdf.memLimit === "number" &&
      typeof vaultKdf.alg === "number";
    const validVerifier =
      vaultVerifier &&
      typeof vaultVerifier.nonce === "string" &&
      typeof vaultVerifier.ciphertext === "string";

    if (!validSalt || !validKdf || !validVerifier) {
      return NextResponse.json(
        { error: "Invalid vault setup payload." },
        { status: 400 },
      );
    }

    user.vaultSalt = vaultSalt;
    user.vaultKdf = {
      opsLimit: vaultKdf.opsLimit,
      memLimit: vaultKdf.memLimit,
      alg: vaultKdf.alg,
    };
    user.vaultVerifier = {
      nonce: vaultVerifier.nonce,
      ciphertext: vaultVerifier.ciphertext,
    };
    user.vaultEnabled = true;
    await user.save();

    return NextResponse.json(
      {
        vaultEnabled: true,
        vaultSalt: user.vaultSalt,
        vaultKdf: user.vaultKdf,
        vaultVerifier: user.vaultVerifier,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[VAULT_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
