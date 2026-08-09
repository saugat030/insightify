"use client";

// Client-only cryptography for the Encrypted Secrets Vault.
//
// NON-NEGOTIABLE: this module must never be imported by an API route, Server
// Component, or middleware. All key derivation, encryption, and decryption
// happen exclusively in the browser. The server only ever stores/returns the
// opaque { nonce, ciphertext } blobs produced here.
//
// libsodium is WASM-based, so it is imported lazily and its `ready` promise is
// awaited before any use. The lazy import also keeps it out of any server bundle.

// The libsodium-wrappers types are a flat module (no `Sodium` interface), so we
// type the resolved library as the module's own shape.
type Sodium = typeof import("libsodium-wrappers-sumo");

// Argon2id parameters. Stored alongside the salt on the User document so they
// can be raised in the future without breaking vaults created under old params.
export interface KdfParams {
  opsLimit: number;
  memLimit: number;
  alg: number;
}

// The opaque blob shape persisted in the DB. Both fields are base64.
export interface CipherBlob {
  nonce: string;
  ciphertext: string;
}

// The constant plaintext sealed at setup to make the verifier. Decrypting it
// successfully on unlock proves the typed passphrase derived the right key —
// with zero server involvement.
export const VAULT_VERIFIER_PLAINTEXT = "vault-ok";

let sodiumPromise: Promise<Sodium> | null = null;

// Lazily load libsodium and await its WASM `ready` promise exactly once.
export async function getSodium(): Promise<Sodium> {
  if (!sodiumPromise) {
    sodiumPromise = import("libsodium-wrappers-sumo").then(async (mod) => {
      // libsodium is CJS; under ESM interop the library object may sit on
      // `.default` or be the namespace itself. Handle both, then await WASM init.
      const sodium = ((mod as unknown as { default?: Sodium }).default ??
        mod) as Sodium;
      await sodium.ready;
      return sodium;
    });
  }
  return sodiumPromise;
}

// The default KDF cost. INTERACTIVE (~64MB, moderate ops) keeps unlock snappy on
// low-end devices while still being memory-hard against offline cracking.
export async function defaultKdfParams(): Promise<KdfParams> {
  const sodium = await getSodium();
  return {
    opsLimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    memLimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    alg: sodium.crypto_pwhash_ALG_ARGON2ID13,
  };
}

// Generate a fresh per-user random salt (16 bytes), base64-encoded. Public/safe
// to store in clear.
export async function generateSalt(): Promise<string> {
  const sodium = await getSodium();
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  return sodium.to_base64(salt, sodium.base64_variants.ORIGINAL);
}

// Derive the 32-byte symmetric key from the passphrase + salt via Argon2id.
// The returned key lives only in browser memory. Never persist or transmit it.
export async function deriveKey(
  passphrase: string,
  saltB64: string,
  params: KdfParams,
): Promise<Uint8Array> {
  const sodium = await getSodium();
  const salt = sodium.from_base64(saltB64, sodium.base64_variants.ORIGINAL);
  return sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    passphrase,
    salt,
    params.opsLimit,
    params.memLimit,
    params.alg,
  );
}

// Encrypt a UTF-8 string with a fresh random nonce. secretbox is
// XSalsa20-Poly1305 (authenticated); a 24-byte random nonce is generated per
// call and never reused with the same key.
export async function encryptString(
  plaintext: string,
  key: Uint8Array,
): Promise<CipherBlob> {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(
    sodium.from_string(plaintext),
    nonce,
    key,
  );
  return {
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
  };
}

// Decrypt a blob. Throws if the key is wrong or the ciphertext was tampered
// with (Poly1305 auth failure) — decryption fails loudly, never silently.
export async function decryptString(
  blob: CipherBlob,
  key: Uint8Array,
): Promise<string> {
  const sodium = await getSodium();
  const nonce = sodium.from_base64(blob.nonce, sodium.base64_variants.ORIGINAL);
  const ciphertext = sodium.from_base64(
    blob.ciphertext,
    sodium.base64_variants.ORIGINAL,
  );
  const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  return sodium.to_string(plaintext);
}

// Seal the known verifier constant so the client can later confirm a passphrase
// offline. Called once at setup.
export async function makeVerifier(key: Uint8Array): Promise<CipherBlob> {
  return encryptString(VAULT_VERIFIER_PLAINTEXT, key);
}

// Return true iff `key` decrypts the verifier to the expected constant.
export async function verifyKey(
  verifier: CipherBlob,
  key: Uint8Array,
): Promise<boolean> {
  try {
    const decrypted = await decryptString(verifier, key);
    return decrypted === VAULT_VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

// Crockford base32 alphabet (no I/L/O/U — avoids visual ambiguity).
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// Generate a high-entropy recovery-style passphrase in the browser: 20 random
// bytes (160 bits) encoded as Crockford base32 and grouped for readability,
// e.g. "K7QF2-9WXMB-3RTHV-8NPZ4-...". The user copies and stores this; it is the
// recommended backup path. zxcvbn scores it at maximum strength.
export async function generatePassphrase(): Promise<string> {
  const sodium = await getSodium();
  const bytes = sodium.randombytes_buf(20);

  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    out += CROCKFORD[parseInt(chunk, 2)];
  }

  // Group into blocks of 5 characters separated by dashes.
  return out.match(/.{1,5}/g)!.join("-");
}
