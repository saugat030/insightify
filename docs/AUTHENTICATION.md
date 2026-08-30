# Authentication — Architecture, Flows & Review

> How Insightify authenticates users: JWT access tokens held in memory, refresh
> tokens in an httpOnly cookie backed by a server-side allow-list, bcrypt
> password hashing, and Google OAuth. This document describes the system as
> built, then reviews it against current practice.

- **Audience:** developers working on auth, and anyone assessing security posture
- **Status of the code at time of writing:** password flow solid; **Google OAuth
  is broken** (see [§7.1](#71-critical))
- **Related:** [`ENCRYPTED_VAULT.md`](./ENCRYPTED_VAULT.md) — the vault is
  deliberately *orthogonal* to auth (auth answers "who are you?", the vault
  answers "can anyone but you read this?")

---

## Table of contents

1. [Overview](#1-overview)
2. [Components & files](#2-components--files)
3. [Data model](#3-data-model)
4. [Token design](#4-token-design)
5. [The flows](#5-the-flows)
6. [Route protection](#6-route-protection)
7. [Review: findings](#7-review-findings)
8. [What is done well](#8-what-is-done-well)
9. [Recommendations, prioritised](#9-recommendations-prioritised)
10. [Endpoint reference](#10-endpoint-reference)

---

## 1. Overview

Insightify uses a **split-token** scheme, the standard approach for SPAs that
must survive a page reload without exposing long-lived credentials to
JavaScript:

| Token | Lifetime | Stored | Reachable by JS? | Purpose |
| --- | --- | --- | --- | --- |
| **Access token** | 15 min | React state / module variable (memory) | Yes | Sent as `Authorization: Bearer` on every API call |
| **Refresh token** | 30 days | `httpOnly` cookie | **No** | Mints new access tokens |

The security property that makes this worthwhile: **an XSS bug cannot steal the
refresh token**, because `httpOnly` cookies are invisible to `document.cookie`.
The worst an attacker gets is a 15-minute access token. In exchange, the app
accepts that the in-memory access token is lost on refresh, which is why every
page load begins with a silent `POST /api/auth/refresh`.

Refresh tokens are additionally tracked in a database **allow-list**
(`RefreshToken`), so a session can be revoked server-side — something a pure
stateless JWT scheme cannot do.

```
┌── BROWSER ────────────────────────────────────────────────────────────┐
│  AuthProvider (React context)                                         │
│    accessToken ── in memory only, 15 min ──▶ axios Authorization hdr  │
│         ▲                                                             │
│         │ POST /api/auth/refresh (on mount, and on any 401)           │
└─────────┼─────────────────────────────────────────────────────────────┘
          │  Cookie: refreshToken (httpOnly, 30d)  ── sent automatically
┌─────────┼─────────────────────────────────────────────────────────────┐
│  SERVER                                                               │
│    verify signature ──▶ look up jti in RefreshToken allow-list        │
│                     ──▶ check expiry ──▶ issue new access token       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Components & files

| File | Role |
| --- | --- |
| [`lib/auth.ts`](../lib/auth.ts) | Signs/verifies both token types. Throws at import if `JWT_SECRET` / `JWT_REFRESH_SECRET` are missing. |
| [`models/User.ts`](../models/User.ts) | User schema, bcrypt pre-save hook, `comparePassword()`, tier quota helpers. |
| [`models/RefreshToken.ts`](../models/RefreshToken.ts) | Refresh-token allow-list, with a TTL index for automatic cleanup. |
| [`hooks/useAuth.tsx`](../hooks/useAuth.tsx) | `AuthProvider` — holds the access token and user object; `login`/`register`/`googleLogin`/`logout`. |
| [`lib/axiosInstance.ts`](../lib/axiosInstance.ts) | Attaches the bearer token; intercepts `401` and retries once after refreshing. |
| [`middleware.ts`](../middleware.ts) | Edge cookie *presence* check for a small set of routes. |
| [`app/_components/private/rolegaurd.tsx`](../app/_components/private/rolegaurd.tsx) | Client-side role gate for private layouts. |
| `app/api/auth/*` | `register`, `login`, `refresh`, `logout`, `me`, `google`, `change-password`. |

---

## 3. Data model

### `User`

```
username, email (unique, lowercased), password (bcrypt, select:false),
googleId (unique, sparse), profilePicture, role ("admin" | "user"),
tier ("free" | "pro"), linksCreatedCount, lastResetDate, createdAt,
vaultEnabled, vaultSalt, vaultKdf, vaultVerifier      ← see ENCRYPTED_VAULT.md
```

- `password` is **not required** when `googleId` is present, so Google-only
  accounts have no password at all.
- `password` uses `select: false` — it is never returned unless a query
  explicitly asks with `.select("+password")`.
- Hashing happens in a `pre("save")` hook at **bcrypt cost 12**, and only when
  the password field was actually modified.

### `RefreshToken` (the allow-list)

```
user (ObjectId ref), jti (unique), expires (Date), createdAt
```

`RefreshTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 })` — MongoDB
deletes rows automatically once `expires` passes, so no cleanup cron is needed.

---

## 4. Token design

### Access token — `generateAccessToken()`

```jsonc
{ "userId": "<mongo id>", "email": "<email>" }   // HS256, expiresIn: "15m"
```

Verified by `verifyAccessToken()`, which returns the payload or `null`. Every
protected API route repeats this inline:

```ts
const authHeader = req.headers.get("Authorization");
const token = authHeader.split(" ")[1];
const payload = verifyAccessToken(token);   // -> { userId, email } | null
```

### Refresh token — `generateRefreshToken()`

```jsonc
{ "userId": "<mongo id>", "jti": "<uuid>" }     // HS256, expiresIn: "30d"
```

The `jti` is the handle used for revocation: the same value is written to the
`RefreshToken` collection, and refresh requires it to still be present.

> **Note:** the two token types are signed with **different secrets**
> (`JWT_SECRET` vs `JWT_REFRESH_SECRET`), so an access token can never be
> replayed as a refresh token.

---

## 5. The flows

### 5.1 Registration

```
POST /api/auth/register { username, email, password }
  ├─ reject if any field missing                      -> 400
  ├─ reject if password.length < 8                    -> 400
  ├─ reject if email already exists                   -> 409
  └─ new User(...).save()   (pre-save hook bcrypts)   -> 201
```

No tokens are issued. The client (`useAuth.register`) immediately calls
`login()` afterwards.

### 5.2 Login (password)

```
POST /api/auth/login { email, password }
  ├─ User.findOne({email}).select("+password")
  ├─ user.comparePassword(password)      ─ fail ->    401 "Invalid email or password"
  ├─ generateAccessToken({userId, email})
  ├─ generateRefreshToken({userId})  ->  { token, jti }
  ├─ RefreshToken.deleteMany({ user })      ← wipes ALL other sessions
  ├─ RefreshToken.create({ user, jti, expires: +30d })
  ├─ Set-Cookie refreshToken=<jwt>  httpOnly, secure(prod), sameSite=lax, 30d
  └─ 200 { user, accessToken }
```

### 5.3 Session bootstrap (every page load)

`AuthProvider` cannot see the httpOnly cookie, so on mount it always tries:

```
POST /api/auth/refresh          (cookie sent automatically)
  ├─ success -> store accessToken in memory, then GET /api/auth/me
  └─ failure -> treat as logged out
```

This is why an unauthenticated visitor produces a `401` on `/api/auth/refresh`
in the console on first load. **That 401 is expected behaviour, not a bug.**

### 5.4 Refresh

```
POST /api/auth/refresh
  ├─ read refreshToken cookie                         -> 401 if absent
  ├─ verifyRefreshToken(signature)                    -> 401 if invalid
  ├─ RefreshToken.findOne({ jti, user })              -> 401 if revoked
  ├─ check tokenEntry.expires                         -> 401 (+ delete row)
  ├─ User.findById(userId)                            -> 404 if gone
  └─ 200 { accessToken }        ← a NEW access token; refresh token unchanged
```

### 5.5 Automatic retry on 401

`lib/axiosInstance.ts` response interceptor:

```
any 401 (except on /auth/me,/login,/register,/refresh)
  └─ mark request _retry
     └─ refreshAccessToken()        ← deduped via a module-level promise
        ├─ success -> replay the original request with the new token
        └─ failure -> dispatch window event "auth:token-refresh-failed"
                      -> AuthProvider clears user + token
```

The shared `tokenRefreshPromise` means ten concurrent 401s trigger **one**
refresh, not ten.

### 5.6 Logout

```
POST /api/auth/logout
  ├─ verify cookie -> RefreshToken.deleteOne({ jti })   (server-side revocation)
  └─ cookieStore.delete("refreshToken")
Client: clear user + access token, router.push("/login")
```

### 5.7 Google OAuth (⚠ currently broken — see §7.1)

```
Browser (@react-oauth/google, auth-code flow) -> code
POST /api/auth/google { code }
  ├─ oAuth2Client.getToken(code)          ← needs GOOGLE_CLIENT_SECRET
  ├─ verifyIdToken({ idToken, audience })
  ├─ find user by email
  │    ├─ none  -> create { username, email, googleId, profilePicture }
  │    └─ exists-> link googleId onto the existing account
  ├─ jwt.sign({ id, role }, JWT_SECRET, 15m)          ← WRONG CLAIM SHAPE
  ├─ jwt.sign({ id, role }, JWT_REFRESH_SECRET, 7d)   ← no jti, not persisted
  └─ Set-Cookie refreshToken  httpOnly, sameSite=strict, 7d
```

### 5.8 Change password

```
POST /api/auth/change-password { oldPassword, newPassword }   (Bearer required)
  ├─ verify access token, load user WITH +password
  ├─ newPassword length >= 8
  ├─ comparePassword(oldPassword)          -> 401 if wrong
  └─ user.password = newPassword; save()   (hook re-hashes)
```

---

## 6. Route protection

There are **three independent layers**, and they do not cover the same routes:

| Layer | Where | What it actually checks |
| --- | --- | --- |
| Edge middleware | `middleware.ts` | Only that a `refreshToken` cookie **exists** — no signature check. Matcher: `/dashboard/:path*`, `/login`, `/register`, `/profile/:path*`. |
| Client `RoleGuard` | private layouts | `user` is loaded and `user.role` is allowed; redirects to `/login` or `/unauthorized`. |
| **API routes** | every `app/api/**` handler | Verifies the JWT signature and loads the user. **This is the only real enforcement.** |

Routes such as `/editor`, `/links`, `/settings`, `/media` and `/admin/*` are
**not** in the middleware matcher — they are gated only by `RoleGuard` on the
client. That is not a data breach (the APIs behind them are properly
authenticated), but it does mean the page shell renders before redirecting.

---

## 7. Review: findings

### 7.1 Critical

#### F1 — Google OAuth issues tokens with the wrong claim shape (breaks Google sign-in)

`app/api/auth/google/route.ts` hand-rolls its JWTs instead of using
`lib/auth.ts`, and uses different claim names:

| | Password flow | Google flow |
| --- | --- | --- |
| Access token claims | `{ userId, email }` | `{ id, role }` |
| Refresh token claims | `{ userId, jti }` | `{ id, role }` |
| Written to allow-list | yes | **no** |

Verified by running the real `lib/auth.ts` against a token signed the way the
Google route signs it:

```
login route  -> payload.userId = "507f1f77bcf86cd799439011"
google route -> payload.userId = undefined   | actual claims: id,role
google refresh -> jti = undefined | userId = undefined
```

`verifyAccessToken()` does `jwt.verify(...) as AccessTokenPayload` — a **TypeScript
cast, not a runtime validation** — so the token passes verification and then
every route reads `payload.userId` as `undefined`.

**Consequences**

1. Every protected endpoint does `User.findById(undefined)` → Mongoose coerces
   this to `findOne({_id: null})` → `null` → `404 User not found`. A
   Google-authenticated user can call **no** protected API.
2. The refresh token carries no `jti` and is never inserted into
   `RefreshToken`, so `/api/auth/refresh` finds no allow-list row and returns
   `401 Token has been revoked`. Since `AuthProvider` calls refresh on mount,
   **the session dies at the first page reload**.
3. Google sessions cannot be revoked at logout — `deleteOne({ jti: undefined })`
   matches nothing.

*Checked and ruled out:* whether the `undefined` values collapse the allow-list
query into an empty filter that would match *any* token (an auth bypass). They
do not — Mongoose retains the keys with `undefined` values, so the query matches
nothing. This is a **broken flow, not a bypass**.

#### F2 — Google account linking does not check `email_verified`

```ts
const { email, name, picture, sub: googleId } = payload;
// ... if a user with this email exists, link googleId onto it
```

The `email_verified` claim from the ID token is never inspected. If an ID token
can be obtained for an account whose email is unverified but matches an existing
password account, the flow **links to and grants full access to that account**
without any proof of the password. This is the classic pre-account-takeover
linking vector. Google normally only issues verified emails for consumer
accounts, but the claim exists precisely so relying parties check it.

#### F3 — `GOOGLE_CLIENT_SECRET` is not configured

`.env.local` defines `NEXT_PUBLIC_GOOGLE_CLIENT_ID` but **not**
`GOOGLE_CLIENT_SECRET`, which `oAuth2Client.getToken(code)` requires. In the
current environment the Google exchange fails before any of F1/F2 matters.

### 7.2 Important

| # | Finding | Why it matters |
| --- | --- | --- |
| **F4** | **No refresh-token rotation or reuse detection.** The same 30-day token is reused for its whole life. | A stolen refresh token is valid for 30 days and its use is indistinguishable from the legitimate user's. Rotation + reuse detection turns theft into a detectable event. |
| **F5** | **Changing the password does not revoke sessions.** `change-password` never touches `RefreshToken`. | Defeats the main reason people change passwords. An attacker with a stolen refresh token keeps access. |
| **F6** | **No rate limiting** on `login`, `register`, or `refresh`. | Credential stuffing and brute force are unimpeded. bcrypt cost 12 slows each attempt but is not a substitute. |
| **F7** | **User enumeration.** `register` returns `409 "Email already in use"`; `login` runs bcrypt only when the user exists, so response timing differs measurably. | Lets an attacker build a list of valid accounts before attacking them. |
| **F8** | **`verifyAccessToken` casts instead of validating.** | This is the *root cause* that let F1 ship silently. A runtime shape check would have failed loudly. |
| **F9** | **Middleware covers only 4 route patterns**; `/editor`, `/links`, `/settings`, `/media`, `/admin/*` rely on client-side `RoleGuard`. | Not a data leak (APIs are enforced) but inconsistent, and it lets private shells paint before redirecting. |

### 7.3 Moderate / hygiene

| # | Finding |
| --- | --- |
| **F10** | **Login wipes every other session** — `RefreshToken.deleteMany({ user })` before creating the new one. Signing in on a phone silently logs you out on your laptop. This may be intentional; if so it should be documented, and if not it should be `deleteOne` on the *old* jti. |
| **F11** | **Cookie settings differ between flows** — password: `sameSite: "lax"`, 30 days; Google: `sameSite: "strict"`, 7 days. Also the Google cookie uses `maxAge` while login uses `expires`. |
| **F12** | **`/api/auth/change-password` has no caller in the UI** and doesn't handle Google-only accounts gracefully (they hit "Incorrect old password" because they have no password at all). |
| **F13** | **`RoleGuard` logs the full user object to the console on every render** (`console.log("Role guard triggered…", user)`) — PII in the production browser console. |
| **F14** | **Registration doesn't enforce username uniqueness** (no unique index, no check), while the admin create-user path does check it. Inconsistent. |
| **F15** | **Password policy is length ≥ 8 only.** `zxcvbn` is already a dependency (added for the vault) and could enforce real strength. |
| **F16** | **`middleware.ts` is deprecated in Next 16** — logs a warning on every boot; should become `proxy.ts`. |
| **F17** | **`/api/auth/me` returns the whole user document** (minus password), including `googleId`, `vaultSalt`, `vaultVerifier`. All safe by design, but broader than needed. |
| **F18** | **Auth boilerplate is duplicated in ~15 route handlers** rather than shared in one helper — the kind of drift that produced F1. |

---

## 8. What is done well

These are deliberate, correct choices and should be preserved:

- **Access token in memory, refresh token in an `httpOnly` cookie.** This is the
  right split. XSS cannot exfiltrate the long-lived credential.
- **Separate secrets** for access and refresh tokens.
- **Server-side allow-list with `jti`** — real revocation, which stateless JWT
  schemes cannot do. Logout genuinely invalidates.
- **TTL index** on `RefreshToken.expires` — expired rows disappear without a cron.
- **bcrypt cost 12**, hashing only on modification, `select: false` on the field.
- **Short access-token lifetime** (15 minutes) limits the blast radius of a leak.
- **Fail-fast secret validation** — `lib/auth.ts` throws at import if the secrets
  are missing, rather than silently signing with `undefined`.
- **Generic login error** (`"Invalid email or password"`) avoids *direct*
  enumeration.
- **Deduplicated refresh** — the shared `tokenRefreshPromise` prevents a refresh
  stampede when several requests 401 at once, plus `_retry` prevents infinite
  loops.
- **Auth and encryption are properly separated** — the vault passphrase is
  independent of the login password (see `ENCRYPTED_VAULT.md`).

---

## 9. Recommendations, prioritised

### Do first (correctness / security)

1. **Fix the Google route (F1).** Delete the hand-rolled `jwt.sign` calls and use
   `generateAccessToken({ userId, email })` / `generateRefreshToken({ userId })`,
   then persist the `jti` to `RefreshToken` and set the cookie exactly as
   `login` does. Ideally extract the shared "issue a session" logic used by
   `login` and `google` into one function so they cannot drift again.
2. **Check `email_verified` (F2)** before creating *or linking* a Google account.
   Refuse, or require a password challenge, when linking to an existing account.
3. **Validate token payload shape at runtime (F8)** — have `verifyAccessToken`
   return `null` unless `userId` is a non-empty string. This alone would have
   surfaced F1 immediately.
4. **Revoke sessions on password change (F5)** — `RefreshToken.deleteMany({ user })`
   inside `change-password`, and clear the caller's cookie.
5. **Set `GOOGLE_CLIENT_SECRET` (F3)** or hide the Google buttons when it is absent.

### Do next (hardening)

6. **Refresh-token rotation with reuse detection (F4):** issue a new `jti` on
   every refresh, delete the old row, and if a *already-used* jti is presented,
   treat it as theft and revoke that user's whole token family.
7. **Rate limiting (F6)** on `login`/`register`/`refresh` — per-IP and per-account.
8. **Constant-time login (F7):** run a dummy bcrypt compare when the user is not
   found, and make `register` respond identically whether or not the email exists
   (send a "check your inbox" style response instead of `409`).
9. **Extract one `requireAuth(req)` / `requireAdmin(req)` helper (F18)** and use
   it in every route handler.
10. **Widen the middleware matcher (F9)** to all private routes, or drop the
    middleware layer entirely and rely on `RoleGuard` + API enforcement — but
    pick one deliberately.

### Cleanup

11. Remove the `RoleGuard` console logging (F13).
12. Align cookie flags between the two login paths (F11).
13. Rename `middleware.ts` → `proxy.ts` for Next 16 (F16).
14. Decide and document the single-session policy (F10).
15. Add `zxcvbn` strength gating at registration (F15); enforce username
    uniqueness or drop the notion (F14).
16. Trim `/api/auth/me` to the fields the client actually uses (F17).

---

## 10. Endpoint reference

| Method & path | Auth required | Body | Success | Failure modes |
| --- | --- | --- | --- | --- |
| `POST /api/auth/register` | — | `{username, email, password}` | `201 {message}` | `400` missing/short password · `409` email taken |
| `POST /api/auth/login` | — | `{email, password}` | `200 {user, accessToken}` + cookie | `400` missing · `401` bad credentials |
| `POST /api/auth/refresh` | cookie | — | `200 {accessToken}` | `401` absent/invalid/revoked/expired · `404` user gone |
| `POST /api/auth/logout` | cookie (optional) | — | `200 {message}` | always clears the cookie |
| `GET /api/auth/me` | Bearer | — | `200 <user minus password>` | `401` · `404` |
| `POST /api/auth/google` | — | `{code}` | `200 {accessToken, user}` + cookie | `400` no code/payload · `500` exchange failed |
| `POST /api/auth/change-password` | Bearer | `{oldPassword, newPassword}` | `200 {success}` | `400` short · `401` bad old password · `404` |

### Environment variables

| Name | Required | Used by |
| --- | --- | --- |
| `JWT_SECRET` | yes (throws if missing) | access tokens |
| `JWT_REFRESH_SECRET` | yes (throws if missing) | refresh tokens |
| `MONGODB_URI` | yes | all persistence |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | for Google | client button + `audience` check |
| `GOOGLE_CLIENT_SECRET` | for Google | **currently unset** — code exchange |

---

*Reviewed against the codebase as of this document's commit. Findings F1–F3 were
verified by executing the real `lib/auth.ts`; the remainder are from code
review.*
