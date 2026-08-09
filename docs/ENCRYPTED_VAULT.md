# Encrypted Secrets Vault — Feature Documentation

> End-to-end, zero-knowledge encryption for the Markdown editor. Users can flip
> any document into "encrypted mode"; its content is encrypted **in the browser**
> before it ever reaches the API, and the database only ever stores ciphertext.
> The key is derived from a **vault passphrase** the server never receives and
> cannot reset.

- **Status:** implemented (v1)
- **Branch:** `refactor/layout-shift`
- **Scope:** per-document encryption toggle inside the existing tabbed editor
- **Security claim this enables:** *"Your encrypted secrets are locked with a key
  derived from a passphrase we never receive. We cannot decrypt them, and we
  cannot reset the passphrase."*

---

## Table of contents

1. [Overview](#1-overview)
2. [Security & threat model](#2-security--threat-model)
3. [Cryptographic design](#3-cryptographic-design)
4. [The three runtime flows](#4-the-three-runtime-flows)
5. [Data model changes](#5-data-model-changes)
6. [API reference](#6-api-reference)
7. [Client architecture](#7-client-architecture)
8. [File-by-file change log](#8-file-by-file-change-log)
9. [Dependencies added](#9-dependencies-added)
10. [Design decisions & rationale](#10-design-decisions--rationale)
11. [Verification performed](#11-verification-performed)
12. [Known limitations](#12-known-limitations)
13. [Future work](#13-future-work)
14. [How to use / operate](#14-how-to-use--operate)

---

## 1. Overview

### What was added

A per-entry **"encrypted mode"** for the Markdown editor. Any tab can be toggled
to encrypted; from that point its content is stored as an opaque
`{ nonce, ciphertext }` blob. Reading it back requires the vault to be
**unlocked** with the user's vault passphrase, which happens entirely in the
browser.

The feature is deliberately **orthogonal to authentication**:

| Concern | Mechanism | Answers |
| --- | --- | --- |
| *Who is this user?* | Existing JWT auth (unchanged) | Which blobs a user may fetch |
| *Can anyone but the user read this content?* | New vault encryption | Whether the content is readable at all |

The JWT layer gates **access to blobs**. The vault passphrase gates **readability
of blobs**. The two secrets are independent by design — the vault passphrase is
never the login password.

### The non-negotiable rule

> **All cryptographic operations — key derivation, encryption, decryption —
> happen exclusively in the browser.** The moment the passphrase, the derived
> key, or any plaintext secret touches the server (API route, Server Component,
> middleware), the zero-knowledge guarantee is broken.

The server's only role is to **store and return opaque blobs** and enforce the
existing JWT authorization. It is a dumb pass-through.

### High-level shape

```
┌─────────────────────────── BROWSER (trusted) ───────────────────────────┐
│                                                                          │
│  passphrase ──Argon2id(salt)──▶ 32-byte key ──held in VaultProvider mem  │
│                                        │                                 │
│           plaintext ──secretbox(key, fresh nonce)──▶ { nonce, ciphertext}│
│                                        │                                 │
└────────────────────────────────────────┼────────────────────────────────┘
                                          │  only opaque blobs cross here
┌────────────────────────── SERVER (untrusted) ───────────────────────────┐
│  /api/vault, /api/markdown  →  MongoDB stores { nonce, ciphertext }      │
│  never sees: passphrase, key, or plaintext                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Security & threat model

### What this protects against

- **A malicious or compromised server operator.** They can read the database and
  every API request/response and still cannot decrypt content — they never
  receive the passphrase or key.
- **A database leak / stolen backup.** Dumped documents are ciphertext. Recovering
  plaintext requires the passphrase; Argon2id makes offline brute-force expensive,
  and the strength gate (see below) raises the floor on passphrase entropy.
- **Network interception of the app's own API traffic.** Request bodies for
  encrypted docs contain only `{ nonce, ciphertext }`.

### What this does *not* protect against (be honest about these)

- **XSS in the browser while the vault is unlocked.** The derived key lives in JS
  memory during a session; a script-injection vulnerability could read it or the
  decrypted plaintext. E2EE narrows the trust boundary to the client but does not
  eliminate client-side risk. **Keeping the app XSS-free remains essential.**
- **A malicious *frontend* deploy.** Because the crypto runs in code the server
  serves, an operator who ships hostile JavaScript could exfiltrate the passphrase
  at entry time. This is the inherent limit of browser-delivered E2EE (true of
  Bitwarden/Proton web apps too). Native/extension clients reduce this; out of
  scope here.
- **Metadata.** See [§2.1](#21-what-remains-visible-to-the-server).
- **A forgotten passphrase.** There is **no reset**. Forgetting it means the
  encrypted content is permanently unrecoverable. This is a property of the model,
  not a bug — and it is surfaced prominently at setup.

### 2.1 What remains visible to the server

Encrypting content does **not** hide everything. The server (and thus a DB leak)
can still see:

| Visible to server | Why | Could be hidden by |
| --- | --- | --- |
| Document **title** | Kept plaintext to render the tab bar & enable listing/search | Encrypting titles (future work) |
| Document **existence & count** | Rows exist in the collection | Padding / decoy entries (not planned) |
| **Timestamps** (`createdAt`, `updatedAt`) | Stored in clear | — |
| **Ownership** (`user` id) | Required for JWT-gated access | — |
| Approximate **content length** | Ciphertext length ≈ plaintext length | Length padding (not planned) |
| The fact a doc **is encrypted** | `encrypted` flag | — |

The vault salt, KDF params, and verifier are also stored in clear. **This is
safe** — they are public inputs; none of them reveals the passphrase.

---

## 3. Cryptographic design

All crypto is implemented in **[`lib/vault/crypto.ts`](../lib/vault/crypto.ts)**
using a single vetted library, `libsodium-wrappers-sumo`. Nothing is hand-rolled.

### 3.1 Primitives

| Role | Primitive | libsodium call | Notes |
| --- | --- | --- | --- |
| Key derivation (KDF) | **Argon2id** | `crypto_pwhash` with `ALG_ARGON2ID13` | Memory-hard, GPU/ASIC-resistant |
| Symmetric cipher | **XSalsa20-Poly1305** (`secretbox`) | `crypto_secretbox_easy` / `_open_easy` | Authenticated: decrypt fails loudly on tamper/wrong key |
| Randomness | libsodium CSPRNG | `randombytes_buf` | Salt, nonces, generated passphrase |
| Encoding | Base64 (`ORIGINAL` variant) | `to_base64` / `from_base64` | All blobs stored as base64 strings |

### 3.2 Parameters

- **Salt:** 16 bytes (`crypto_pwhash_SALTBYTES`), random per user, base64.
- **Derived key:** 32 bytes (`crypto_secretbox_KEYBYTES`).
- **Nonce:** 24 bytes (`crypto_secretbox_NONCEBYTES`), **fresh random per
  encryption** — never reused with the same key.
- **KDF cost:** `OPSLIMIT_INTERACTIVE` + `MEMLIMIT_INTERACTIVE` (~64 MB).
  Measured derive time ≈ **142 ms** on the dev machine.
  - The three cost values (`opsLimit`, `memLimit`, `alg`) are **stored on the User
    document** (`vaultKdf`) alongside the salt, so they can be raised in the future
    without breaking vaults created under the old params.

### 3.3 The derivation formula

```
passphrase + salt ──Argon2id(ops, mem, alg)──▶ 32-byte key
plaintext ──secretbox(key, random 24-byte nonce)──▶ { nonce, ciphertext }
```

### 3.4 The verifier (how "unlock" is checked without the server)

At setup, the browser encrypts a **known constant** — the string `"vault-ok"`
(`VAULT_VERIFIER_PLAINTEXT`) — with the derived key and stores the resulting
`{ nonce, ciphertext }` as `vaultVerifier`.

On unlock, the browser re-derives the key from the typed passphrase and tries to
decrypt the verifier:

- Decrypts to `"vault-ok"` → passphrase correct → key held for the session.
- Decryption throws (Poly1305 auth failure) → **"Incorrect passphrase."**

**The server is never asked whether the passphrase is right.** It cannot verify or
learn it; the verifier is opaque to it.

### 3.5 Public API of `crypto.ts`

| Export | Purpose |
| --- | --- |
| `getSodium()` | Lazily import libsodium (WASM) and await `ready`, once. |
| `defaultKdfParams()` | Return the INTERACTIVE Argon2id params. |
| `generateSalt()` | Random 16-byte salt, base64. |
| `deriveKey(passphrase, saltB64, params)` | Argon2id → 32-byte `Uint8Array` key. |
| `encryptString(plaintext, key)` | → `{ nonce, ciphertext }` (both base64). |
| `decryptString(blob, key)` | → plaintext; **throws** on wrong key/tamper. |
| `makeVerifier(key)` | Seal the `"vault-ok"` constant. |
| `verifyKey(verifier, key)` | `true`/`false` — does this key open the verifier? |
| `generatePassphrase()` | 160-bit recovery-style key (see §3.6). |
| `VAULT_VERIFIER_PLAINTEXT` | The `"vault-ok"` constant. |
| Types `KdfParams`, `CipherBlob` | Shared shapes. |

### 3.6 The "generate a strong passphrase" option

`generatePassphrase()` produces **20 random bytes (160 bits)** encoded in
**Crockford base32** (alphabet excludes `I/L/O/U` to avoid visual ambiguity) and
grouped into dash-separated blocks, e.g. `K7QF2-9WXMB-3RTHV-8NPZ4-…`. This doubles
as a **recovery-key** style option: the user copies and stores it. zxcvbn scores
it at maximum strength.

---

## 4. The three runtime flows

### Flow 1 — Enable vault (one-time)

```
User picks/generates passphrase (entered twice, zxcvbn-gated)
   │  (browser)
   ├─ generateSalt()
   ├─ deriveKey(passphrase, salt, INTERACTIVE)   ──▶ key (memory)
   ├─ makeVerifier(key)                          ──▶ { nonce, ciphertext }
   │
   └─ POST /api/vault  { vaultSalt, vaultKdf, vaultVerifier }   ← only these leave
                        (never the passphrase or key)
Server: stores the three fields, sets vaultEnabled = true. Vault left unlocked.
```

### Flow 2 — Unlock (per session)

```
Browser has (from GET /api/vault): vaultSalt, vaultKdf, vaultVerifier
User types passphrase
   ├─ deriveKey(passphrase, vaultSalt, vaultKdf) ──▶ candidate key
   ├─ verifyKey(vaultVerifier, candidate)
   │      ├─ true  → hold key in VaultProvider (memory) → isUnlocked
   │      └─ false → "Incorrect passphrase."   (server never consulted)
```

A page refresh clears the key (memory-only) → user re-enters the passphrase.

### Flow 3 — Save / read an encrypted entry

```
SAVE (auto-save, debounced 1.5s):
   plaintext ──encryptContent()──▶ { nonce, ciphertext }
   PUT /api/markdown { id, title, content: ciphertext, encrypted: true, nonce }

READ (open/switch to an encrypted tab):
   GET returns { content: ciphertext, nonce, encrypted: true }
   if unlocked → decryptContent() → show plaintext in the editor
   if locked   → show the "locked" overlay (ciphertext never rendered)
```

> **Note on auto-save:** every save re-encrypts the whole content with a **fresh
> nonce**, so the stored ciphertext changes on each keystroke-batch. This is
> correct and required (nonces are never reused); it is not a bug.

---

## 5. Data model changes

### 5.1 `User` — [`models/User.ts`](../models/User.ts)

Four fields added. **All are opaque/public and safe to store in clear.**

```ts
vaultEnabled: Boolean            // has the user completed one-time setup?
vaultSalt:    String | null      // base64, 16-byte Argon2id salt
vaultKdf: {                      // stored so params can be raised later
  opsLimit: Number,
  memLimit: Number,
  alg:      Number,
}
vaultVerifier: {                 // sealed "vault-ok" for offline passphrase check
  nonce:      String,
  ciphertext: String,
}
```

The existing bcrypt login-password hashing and every other field are **unchanged**.

### 5.2 `MarkdownDoc` — [`models/MarkdownDoc.ts`](../models/MarkdownDoc.ts)

Two fields added; the existing `content` field is **reused** to hold ciphertext
when encrypted.

```ts
encrypted: Boolean        // default false
nonce:     String | null  // base64 24-byte nonce; only set when encrypted
// content: for plaintext docs = raw markdown; for encrypted docs = base64 ciphertext
```

Existing plaintext documents are unaffected: `encrypted` defaults to `false`, so
they continue down the original plaintext path with **zero migration**.

---

## 6. API reference

### 6.1 `POST /api/vault` — one-time setup

Persists the material produced in the browser at setup. **No crypto server-side.**

- **Auth:** `Authorization: Bearer <accessToken>`
- **Body:**
  ```json
  {
    "vaultSalt": "<base64>",
    "vaultKdf": { "opsLimit": 2, "memLimit": 67108864, "alg": 2 },
    "vaultVerifier": { "nonce": "<base64>", "ciphertext": "<base64>" }
  }
  ```
- **Validation:** shape only (types + non-empty). The server never inspects
  *meaning* — it cannot understand these values.
- **Responses:** `201` with the stored fields · `409` if the vault is already set
  up (setup is not re-runnable — re-deriving from a new passphrase would orphan
  existing entries) · `400` invalid payload · `401` unauthorized.

### 6.2 `GET /api/vault` — status

- **Auth:** Bearer token.
- **Returns:**
  ```json
  {
    "vaultEnabled": true,
    "vaultSalt": "<base64|null>",
    "vaultKdf": { "opsLimit": 2, "memLimit": 67108864, "alg": 2 } ,
    "vaultVerifier": { "nonce": "…", "ciphertext": "…" }
  }
  ```
  Everything here is safe to expose; the browser needs it to derive and
  self-verify the key.

### 6.3 `/api/markdown` — extended (existing route)

`POST` and `PUT` now accept two optional fields; `GET` returns whole documents
(so the fields flow automatically):

```jsonc
{
  "id": "…",            // PUT only
  "title": "My note",   // always plaintext
  "content": "…",       // ciphertext when encrypted, else raw markdown
  "encrypted": true,
  "nonce": "<base64>"   // required when encrypted; cleared to null when not
}
```

Server behavior: when `encrypted` is truthy it stores `nonce`; when falsy it
forces `nonce = null`. On `PUT`, the encryption fields are only written when the
client provides `encrypted`, so partial saves stay backward-safe. **The route
performs no crypto** — it is pass-through storage gated by the existing JWT check.

---

## 7. Client architecture

### 7.1 `VaultProvider` — [`hooks/useVault.tsx`](../hooks/useVault.tsx)

Session-scoped React context that owns the key lifecycle.

- **Key storage:** the derived key lives in a **`useRef<Uint8Array>`**, *not* in
  React state — so it never lands in serialized state or devtools snapshots. A
  boolean `isUnlocked` flag drives re-renders instead.
- **Never persisted:** the key/passphrase are never written to `localStorage`
  (persistent, XSS-readable) or cookies (sent to server). Memory only.
- **Cleared automatically:** on logout / user switch the key is dropped; on `lock()`
  the key buffer is zeroed (`fill(0)`) before the reference is released.
- **Mounted at:** [`app/(private)/(user)/layout.tsx`](<../app/(private)/(user)/layout.tsx>)
  so the unlocked key survives navigation between the editor and other user pages
  within a session.

**Exposed API:**

| Member | Description |
| --- | --- |
| `isSetup` | Has the user completed setup (`vaultEnabled`)? |
| `isUnlocked` | Is the key currently in memory? |
| `isLoading` | Still fetching status / auth loading. |
| `setup(passphrase)` | Derive key, seal verifier, `POST /api/vault`, leave unlocked. |
| `unlock(passphrase)` | Re-derive, verify against verifier; `true`/`false`. |
| `lock()` | Zero + drop the key. |
| `encryptContent(plaintext)` | → `{ nonce, ciphertext }`; throws if locked. |
| `decryptContent(blob)` | → plaintext; throws if locked. |

### 7.2 Strength gate — [`lib/vault/strength.ts`](../lib/vault/strength.ts)

Lazy wrapper around **zxcvbn-ts v4** (`ZxcvbnFactory(...).check(pw)`). The library
and its dictionary are **dynamically imported** on first use to keep them out of
the initial editor bundle. `MIN_VAULT_SCORE = 3` (out of 0–4); weaker passphrases
are rejected at creation because there is no reset.

### 7.3 UI components

| Component | File | Responsibility |
| --- | --- | --- |
| `VaultSetupDialog` | `editor/_components/vault-setup-dialog.tsx` | One-time setup: choose/generate passphrase, confirm twice, live strength meter, the "no reset / permanent loss" warning + explicit acknowledgement checkbox, copy/generate buttons. |
| `VaultUnlockDialog` | `editor/_components/vault-unlock-dialog.tsx` | Enter passphrase → `unlock()`; "Incorrect passphrase" on failure; Enter-to-submit. |
| Editor integration | `editor/page.tsx` | Per-tab encrypt toggle, encrypt-on-save, decrypt-on-load, locked overlay, encrypted tab indicator (lock icon). |

### 7.4 Editor state handling (the tricky part)

The editor keeps `markdown` = the **plaintext currently shown** for the active
tab, while `docs[i].content` holds **whatever the server returned** (ciphertext for
encrypted docs). Key handlers:

- `activateDoc(doc)` — switching in: plaintext → show directly; encrypted +
  unlocked → decrypt → show; encrypted + locked → show overlay, never render
  ciphertext.
- `persistChange(content, title?)` — auto-save: encrypted docs are encrypted first
  (fresh nonce) then `PUT`; **guarded** so a locked doc is never clobbered with an
  empty buffer.
- `handleToggleEncryption()` — enabling requires an unlocked vault; if not set up →
  open setup; if locked → open unlock; a **pending-encrypt ref** re-runs the encrypt
  once the vault becomes available.
- `handleVaultReady()` — after setup/unlock: decrypt the active doc directly (the
  key is set synchronously by `unlock()`), then run any deferred encrypt.

---

## 8. File-by-file change log

### New files

| File | What / why |
| --- | --- |
| `lib/vault/crypto.ts` | The single client-only crypto module. Chosen so all libsodium usage is in one auditable place and can never be imported server-side. |
| `lib/vault/strength.ts` | Lazy zxcvbn wrapper for the passphrase strength gate. Separate file to keep zxcvbn dynamically imported and out of the main bundle. |
| `hooks/useVault.tsx` | `VaultProvider`/`useVault` — session key lifecycle in memory. Separate from `useAuth` because encryption and authentication are orthogonal concerns. |
| `app/api/vault/route.ts` | Thin pass-through for vault status (GET) and one-time setup (POST). No crypto. |
| `app/(private)/(user)/editor/_components/vault-setup-dialog.tsx` | Setup UX with strength gate + unavoidable warning. |
| `app/(private)/(user)/editor/_components/vault-unlock-dialog.tsx` | Unlock UX; client-side verifier check. |
| `docs/ENCRYPTED_VAULT.md` | This document. |

### Modified files

| File | Change | Why |
| --- | --- | --- |
| `models/User.ts` | + `vaultEnabled`, `vaultSalt`, `vaultKdf`, `vaultVerifier` | Store the public material needed to re-derive & self-verify the key. |
| `models/MarkdownDoc.ts` | + `encrypted`, `nonce` (reuse `content` for ciphertext) | Per-doc encryption without a separate collection (see §10). |
| `app/api/markdown/route.ts` | `POST`/`PUT` accept + persist `encrypted`, `nonce` | Let the editor round-trip encrypted blobs; still no server crypto. |
| `app/(private)/(user)/editor/page.tsx` | Full encryption integration (toggle, encrypt/decrypt, overlay, indicators, dialogs) | The editor is the feature's home. |
| `app/(private)/(user)/layout.tsx` | Wrap children in `VaultProvider`; mount `<Toaster />` | Key must persist across the user area; toasts for vault feedback. |
| `package.json` / lockfile | + dependencies (see §9) | libsodium + zxcvbn. |

---

## 9. Dependencies added

| Package | Type | Purpose |
| --- | --- | --- |
| `libsodium-wrappers-sumo` | dep | Argon2id + secretbox (the `-sumo` build includes Argon2id). WASM; dynamically imported. |
| `@zxcvbn-ts/core` | dep | Passphrase strength scoring (v4 API). |
| `@zxcvbn-ts/language-common` | dep | Dictionary + adjacency graphs for zxcvbn. |
| `@types/libsodium-wrappers-sumo` | dev | TypeScript types. |

Both libraries are **lazy/dynamically imported** inside client code so they never
enter a server bundle and don't bloat the initial editor load.

---

## 10. Design decisions & rationale

### D1 — Extend `MarkdownDoc` instead of a new collection *(chosen)*

The original architecture proposed a separate encrypted-entries collection. The
editor, however, is entirely tab/doc-centric around `MarkdownDoc`, and the feature
is a *per-tab toggle inside that editor*. A separate collection would fork the
editor into two parallel UIs for more code and weaker UX.

**Decision:** add `encrypted` + `nonce` to `MarkdownDoc` and reuse `content` for
ciphertext. The server still only sees `{ nonce, ciphertext }` for encrypted docs —
the zero-knowledge property is identical. **Trade-off:** plaintext and encrypted
docs share a collection (fine; distinguished by the `encrypted` flag).

### D2 — Argon2id `INTERACTIVE` cost *(chosen)*

`MODERATE` (~256 MB) is stronger against offline cracking but can be sluggish in
WASM on low-end devices (~1 s+). `INTERACTIVE` (~64 MB, ~142 ms measured) keeps
unlock snappy while remaining memory-hard.

**Decision:** ship `INTERACTIVE`, but **store the KDF params** on the user so the
cost can be raised later without breaking existing vaults.

### D3 — Titles stay plaintext

The tab bar renders titles before the vault is unlocked; encrypting titles would
break the tab list and server-side listing/search. **Decision:** titles are
plaintext — a documented metadata leak (see §2.1) in exchange for usability.

### D4 — `secretbox` (XSalsa20-Poly1305) as the cipher

The architecture mentioned "XChaCha20-Poly1305 via libsodium's secretbox"; those
are slightly different primitives (libsodium's `secretbox` is XSalsa20-Poly1305).
Both are vetted authenticated ciphers with 24-byte nonces and no reuse risk with
random nonces. **Decision:** use `crypto_secretbox_easy` as named. Switching to the
`crypto_aead_xchacha20poly1305_ietf` API later is a small, localized change.

### D5 — Key in memory only (no `localStorage`/`sessionStorage`)

`localStorage` is persistent and readable by any XSS; cookies are transmitted to
the server. **Decision:** hold the key in `VaultProvider` memory only; a refresh
clears it by design. `sessionStorage` was considered and rejected for v1 (widens
XSS exposure) — it could be an explicit opt-in later.

---

## 11. Verification performed

| Check | Result |
| --- | --- |
| **Crypto round-trip** (standalone Node test mirroring `crypto.ts`) | **9/9 pass** — verifier decrypts with correct key; wrong passphrase fails loudly; tampered ciphertext rejected; content round-trips; fresh nonce per save; both encryptions decrypt to same plaintext. |
| Argon2id INTERACTIVE derive time | ~142 ms |
| `tsc --noEmit` (whole project) | Clean |
| `/editor` route compile + serve (Turbopack) | `200` (then client RoleGuard redirect to `/login` when unauthenticated) — vault client graph compiles cleanly |
| Middleware scope | Matches only `/dashboard`,`/login`,`/register`,`/profile`; never touches vault routes → no server-side crypto |
| Server-boundary grep | No API route/model/middleware imports the crypto module or provider logic |

### Not yet verified (the gap)

The **live end-to-end UI flow** (setup → lock via refresh → unlock → encrypted
save → confirm the `PUT /api/markdown` body carries only `{ nonce, ciphertext }`)
was **not** exercised, because that path is login-gated and needs a seeded MongoDB
user. Recommended manual check once logged in: open the editor, click **Encrypt**,
and inspect the `PUT /api/markdown` request in devtools — `content` should be
base64 ciphertext with a `nonce`, and no plaintext should appear.

---

## 12. Known limitations

1. **No passphrase change/rotation.** Because the content key is derived directly
   from the passphrase, changing it would require re-encrypting every entry
   client-side. Not implemented in v1. (See §13.1.)
2. **Metadata leakage.** Titles, existence, timestamps, ownership, approximate
   length remain visible (see §2.1).
3. **XSS while unlocked** can reach the in-memory key / plaintext. E2EE does not
   remove this; app-level XSS hygiene remains critical.
4. **No cross-document atomicity.** Toggling encryption operates on one document at
   a time. There is no bulk/transactional operation across many docs (relevant
   mainly to future rotation).
5. **Full-content re-encryption per save.** Each auto-save re-encrypts the entire
   content (correct, but O(size) per keystroke-batch). Fine for notes; not tuned
   for very large documents.
6. **Refresh = re-unlock.** By design; there is no "remember unlock" option yet.

---

## 13. Future work

### 13.1 Passphrase change / rotation

Let a user swap their vault passphrase while keeping access to existing content.
Two approaches:

**(a) Client-side bulk re-encryption** — while unlocked, derive a new key (new
salt), then for every encrypted doc: decrypt (old key) → re-encrypt (new key,
fresh nonce) → save; re-seal the verifier; commit. Needs care for atomicity: a
tab close / network drop mid-migration can leave docs split across two keys.
Mitigate with a resumable batch job and an "accept old-or-new key during
migration" transition window.

**(b) Wrapped-master-key (recommended long-term)** — the industry pattern
(1Password/Bitwarden):

```
random master key (DEK)  ──encrypts──▶ all content   (never changes)
passphrase ──Argon2id──▶ wrapping key (KEK) ──encrypts──▶ the DEK (one small blob)
```

Changing the passphrase then only **re-wraps the DEK** (O(1)), never the content.
This also cleanly enables multi-device and recovery keys. It is a larger refactor
(introduce a DEK, store the wrapped DEK, migrate existing vaults) but removes the
rotation pain permanently.

### 13.2 Encrypted titles

Encrypt titles too (stronger metadata protection). Requires decrypting titles
client-side to render the tab bar and a fallback label while locked (e.g.
"🔒 Encrypted note"), plus rethinking any server-side listing/search.

### 13.3 Recovery options

- Explicit **recovery key** at setup (the generated passphrase already serves as
  one; make it a first-class, separately-stored artifact).
- Optional **Shamir split** / printable recovery sheet.

### 13.4 KDF hardening & agility

- Offer/raise to `MODERATE` for high-sensitivity users; auto-upgrade params on next
  unlock (re-derive + re-seal verifier) since params are already stored per user.
- Feed `userInputs` (email/username) into zxcvbn to penalize personal-info
  passphrases.

### 13.5 Session UX

- **Auto-lock on idle** / on tab-hidden timeout.
- Optional **"stay unlocked" via `sessionStorage`** as an explicit, warned opt-in.
- A visible **lock/unlock button** and vault status indicator in the header.

### 13.6 Broader

- **Client-side encrypted search** (local decrypted index; never sent to server).
- **Encrypted export/import** (portable backup of the vault).
- **Sharing** an encrypted note (requires per-recipient key wrapping — depends on
  13.1(b)).
- **Rate-limiting / audit logging** on vault endpoints.
- A dedicated **Settings → Security** panel to set up, change, or disable the vault
  outside the editor.

---

## 14. How to use / operate

### For a user

1. In the editor, click **Encrypt** on any tab.
2. **First time:** the setup dialog appears — choose a strong multi-word
   passphrase *or* click **Generate a strong passphrase**, confirm it, tick the
   acknowledgement, and create the vault. **Store the passphrase safely — it cannot
   be reset.**
3. The document is now encrypted (lock icon on the tab). Editing auto-saves
   encrypted.
4. **After a refresh / new session:** opening an encrypted doc shows a locked
   overlay — click **Unlock vault**, enter the passphrase, and it decrypts.
5. To turn encryption off for a doc, click **Encrypted** → it is re-saved as
   plaintext.

### For a developer

- **Never** import `lib/vault/crypto.ts`, `lib/vault/strength.ts`, or
  `hooks/useVault.tsx` from a Server Component, API route, or middleware. They are
  browser-only; doing so would break the zero-knowledge guarantee (and likely the
  build).
- API routes for the vault must stay **pass-through**: authenticate the JWT, then
  read/write opaque fields. No crypto server-side, ever.
- If you add fields to encrypted docs, decide explicitly whether each is
  plaintext metadata or must be encrypted client-side (default to encrypting
  anything sensitive).
- Regenerate/verify the crypto behavior with a round-trip test after touching
  `crypto.ts` (see §11).

---

*Last updated alongside the v1 implementation on branch `refactor/layout-shift`.*
