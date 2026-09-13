# Authentication — Architecture, Flows & Review

> How Insightify authenticates users: JWT access tokens held in memory, refresh
> tokens in an httpOnly cookie backed by a server-side allow-list, bcrypt
> password hashing, and Google OAuth. This document describes the system as
> built, then reviews it against current practice.

- **Audience:** developers working on auth, and anyone assessing security posture
- **Status of the code at time of writing:** password flow solid; **Google OAuth
  was broken** (F1) — ~~see [§7.1](#71-critical)~~ **now fixed**, though Google
  sign-in still cannot run in *development* until `GOOGLE_CLIENT_SECRET` is set
  (F3 — an environment matter, expected to be present in production). F2 has
  since landed, so enabling Google is no longer blocked on it.
- **Fix log:** [`AUTH-FIX.md`](./AUTH-FIX.md) — findings are worked through one
  at a time and recorded there in the order they were fixed. A finding marked
  **✅ Fixed** below is closed; everything unmarked is still open.
- **Related:** [`ENCRYPTED_VAULT.md`](./ENCRYPTED_VAULT.md) — the vault is
  deliberately *orthogonal* to auth (auth answers "who are you?", the vault
  answers "can anyone but you read this?")

---

## Table of contents

1. [Overview](#1-overview)
2. [Components & files](#2-components--files)
3. [Data model](#3-data-model)
4. [Token design](#4-token-design)
5. [The flows](#5-the-flows) — incl. [5.9 Session lifecycle across devices](#59-session-lifecycle-across-devices)
6. [Route protection](#6-route-protection)
7. [Review: findings](#7-review-findings) — incl. [7.4 Architectural assessment](#74-architectural-assessment-is-the-split-token-model-earning-its-keep)
8. [What is done well](#8-what-is-done-well)
9. [Recommendations, prioritised](#9-recommendations-prioritised) — incl.
   [9.1 Remember me](#91-designing-remember-me-under-option-a) and
   [9.2 Email verification (OTP)](#92-email-verification-otp--v2), the two **v2** items
10. [Endpoint reference](#10-endpoint-reference)

> **Fix log:** closed findings are marked ✅ here and written up in
> [`AUTH-FIX.md`](./AUTH-FIX.md). Fixed so far: **F8**, **F1**, **F11**, **F2**.

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
username, email (unique, lowercased), emailVerified (Boolean, default false),
password (bcrypt, select:false),
googleId (unique, sparse), profilePicture, role ("admin" | "user"),
tier ("free" | "pro"), linksCreatedCount, lastResetDate, createdAt,
vaultEnabled, vaultSalt, vaultKdf, vaultVerifier      ← see ENCRYPTED_VAULT.md
```

- `emailVerified` records whether the owner has *proved* they control the
  address. Google sign-ups set it `true` (the ID token is Google's proof);
  password sign-ups stay `false` until the v2 OTP flow ([§9.2](#92-email-verification-otp--v2))
  lands. It gates Google account linking — see [F2](#-f2--google-account-linking-does-not-check-email_verified--fixed).
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

#### Why those four paths are skipped

The inline comment says "prevent infinite loops", but that is only accurate for
one of them. Loops are already prevented by `_retry` (one attempt per request)
and by `refreshAccessToken()` using bare `axios`, which never re-enters the
interceptor. The four entries are actually doing different jobs:

| Skipped path | Real reason |
| --- | --- |
| `/api/auth/refresh` | `loadUserOnMount` calls it *through* `axiosInstance`, so an anonymous visitor's ordinary 401 would fire a second, redundant refresh and then the logout event. |
| `/api/auth/me` | **Only ever called immediately after a successful refresh** (`useAuth.tsx`), so the token is milliseconds old — a 401 there cannot be staleness, and a retry would mint an identical token and fail identically. An optimisation, not a loop guard. A 401 here means something genuinely broken (a deleted user returns **404**, not 401), so failing fast is correct. |
| `/api/auth/login` | 401 means bad credentials; refreshing is meaningless and would mask the error from the form. |
| `/api/auth/register` | **Dead entry** — the route returns 201/400/409 and never 401. |

### 5.6 Logout

```
POST /api/auth/logout
  ├─ verify cookie -> RefreshToken.deleteOne({ jti })   (server-side revocation)
  └─ cookieStore.delete("refreshToken")
Client: clear user + access token, router.push("/login")
```

### 5.7 Google OAuth (✅ token issuance fixed — F1)

```
Browser (@react-oauth/google, auth-code flow) -> code
POST /api/auth/google { code }
  ├─ oAuth2Client.getToken(code)          ← needs GOOGLE_CLIENT_SECRET (F3, open)
  ├─ verifyIdToken({ idToken, audience })
  ├─ find user by email
  │    ├─ none  -> create { username, email, googleId, profilePicture }
  │    ├─ email_verified !== true          -> 403  (F2, fixed)
  │    └─ exists-> link only if that account's emailVerified is true,
  │                otherwise 409            (F2, fixed)
  └─ issueSession(user)        ← the SAME issuer the password flow uses
```

Since the F1 fix, `issueSession()` in [`lib/session.ts`](../lib/session.ts) is
the only place either flow mints a session, so the claim shape, the allow-list
row and the cookie flags are identical by construction. The former
`jwt.sign({ id, role })` calls and the divergent `sameSite=strict`/7-day cookie
are gone. See [AUTH-FIX §2](./AUTH-FIX.md#2--f1--google-oauth-issued-tokens-with-the-wrong-claim-shape).

### 5.8 Change password

```
POST /api/auth/change-password { oldPassword, newPassword }   (Bearer required)
  ├─ verify access token, load user WITH +password
  ├─ newPassword length >= 8
  ├─ comparePassword(oldPassword)          -> 401 if wrong
  └─ user.password = newPassword; save()   (hook re-hashes)
```

---

### 5.9 Session lifecycle across devices

Because `login` runs `RefreshToken.deleteMany({ user })` **before** creating its
own row, at most one refresh-token row can exist per user. The system is
therefore **effectively single-session**, though nothing in the UI says so.

#### Logging in on a second device

| Step | `refreshtokens` rows | Device A | Device B |
| --- | --- | --- | --- |
| A logs in | `jti_A` | working | — |
| B logs in | `jti_A` **deleted**, `jti_B` created | **orphaned** — its cookie references a row that no longer exists | working |
| next 0–15 min | `jti_B` | **still fully working** — the access token is stateless and never checked against the DB | working |
| A's access token expires, or A reloads | `jti_B` | refresh → `findOne({jti_A})` → no match → `401` → cleared, `RoleGuard` redirects to `/login` | working |

Two consequences:

1. **Revocation is not immediate.** For up to 15 minutes (the access-token TTL)
   device A can still read *and mutate* data with a token that is conceptually
   revoked. This is inherent to stateless access tokens — see
   [§7.4](#74-architectural-assessment-is-the-split-token-model-earning-its-keep).
2. **It is silent.** Device A is given no indication; it simply breaks later.

This applies to two browsers on one machine, and to a normal + private window —
each has its own cookie jar and so counts as a separate device.

Related wrinkles:

- Device A's dead cookie remains for 30 days. `middleware.ts` checks only cookie
  *presence*, so A can navigate to `/dashboard`, pass the edge check, render the
  shell, and only then be bounced by `RoleGuard`.
- ✅ ~~**The Google route behaves differently** — it never imports
  `RefreshToken`, so it neither clears existing sessions nor registers its own
  (F1).~~ **Resolved.** Both flows now go through `issueSession()`, so Google
  sign-in clears and registers allow-list rows exactly as the password flow
  does — including the `deleteMany` that makes this section's single-session
  behaviour apply to Google logins too.

#### Logging out of one device

Logout is **correctly scoped** — it removes only the `jti` carried in that
browser's own cookie, and clears only that browser's cookie:

```ts
await RefreshToken.deleteOne({ jti: payload.jti });
cookieStore.delete("refreshToken");
```

| Action | Effect |
| --- | --- |
| Log out on the newest device (B) | Deletes `jti_B`, the only surviving row. A was already orphaned → everything signed out. |
| Log out on the older, orphaned device (A) | `deleteOne({jti_A})` matches nothing (already gone); only A's cookie is cleared. **B is unaffected and stays signed in.** |

So logout never over-reaches. **The asymmetry is that login over-reaches and
logout does not** — the opposite of what you would want.

Gaps this exposes: there is **no "sign out everywhere"** (with only one row
possible, there is nothing to enumerate), and password change revokes nothing
(F5). Also, `deleteMany` → `create` are two separate awaits with no transaction,
so two simultaneous logins can interleave and briefly leave two rows, or have
one clobber the other.

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

#### ✅ F1 — ~~Google OAuth issues tokens with the wrong claim shape (breaks Google sign-in)~~ — FIXED

> **Fixed.** `app/api/auth/google/route.ts` and `app/api/auth/login/route.ts`
> now both call `issueSession()` in [`lib/session.ts`](../lib/session.ts), the
> single place a session is minted. See
> [AUTH-FIX §2](./AUTH-FIX.md#2--f1--google-oauth-issued-tokens-with-the-wrong-claim-shape).
> The analysis below is retained as the record of what was wrong.
>
> ✅ **The F2 warning that stood here is discharged.** Fixing F1 made the
> unverified-email linking vector reachable; F2 has since been fixed, so setting
> `GOOGLE_CLIENT_SECRET` is no longer gated on it.

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
do not — this is a **broken flow, not a bypass**.

> **Correction (added while fixing F8).** The mechanism is not quite what was
> written here originally. Mongoose *does* retain the keys through casting, but
> what makes the query safe is the MongoDB driver's `ignoreUndefined` option,
> which defaults to `false` and therefore serialises `undefined` → `null`:
> the wire filter is `{ jti: null, user: null }`, which matches no row. Set
> `ignoreUndefined: true` on the `mongoose.connect` in `lib/db.ts` and the
> filter becomes `{}` — at which point this **would** be a real bypass. The
> safe default holds today (`lib/db.ts` passes only `bufferCommands: false`),
> but the F8 fix removes the dependency on it: a Google-shaped token is now
> rejected before any query is built.

#### ✅ F2 — ~~Google account linking does not check `email_verified`~~ — FIXED (stage 1 of 2)

> **Fixed.** The route now refuses an unverified Google address outright, and
> refuses to link onto an existing account that has not proved the address
> itself. See [AUTH-FIX §3](./AUTH-FIX.md#3--f2--google-account-linking-did-not-check-email_verified).
> The analysis below is retained as the record of what was wrong.
>
> **A second direction, not in the original review.** Checking `email_verified`
> alone does not close F2, because `register` never verifies email ownership
> either. An attacker can register a password account for `victim@gmail.com`
> first; when the victim later signs in with Google — legitimately
> `email_verified: true` — the flow links onto the attacker's account and the
> victim ends up inside an account whose password the attacker chose. Proof is
> needed from *both* sides, which is why the fix adds an `emailVerified` field
> rather than only reading Google's claim. Stage 2 is the
> [v2 OTP flow](#92-email-verification-otp--v2).

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

> ✅ **Resolved.** This finding was escalated by the F1 fix (the linking code
> became reachable) and has now been fixed in turn. Note the practical effect
> today: since every password account is `emailVerified: false`, Google sign-in
> never links onto one. That relaxes on its own once the v2 OTP flow ships.

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
| ✅ **F8** | ~~**`verifyAccessToken` casts instead of validating.**~~ **Fixed** — see [AUTH-FIX §1](./AUTH-FIX.md#1--f8--token-payload-shape-was-never-validated-at-runtime). | This is the *root cause* that let F1 ship silently. A runtime shape check would have failed loudly. |
| **F9** | **Middleware covers only 4 route patterns**; `/editor`, `/links`, `/settings`, `/media`, `/admin/*` rely on client-side `RoleGuard`. | Not a data leak (APIs are enforced) but inconsistent, and it lets private shells paint before redirecting. |
| **F19** | **The split-token architecture is not banking its own benefits** — full audit in [§7.4](#74-architectural-assessment-is-the-split-token-model-earning-its-keep). **Resolved as a decision (Option A); remains open as work.** | The design pays the full complexity cost of two token types, an interceptor, refresh dedupe and a bootstrap round-trip, while realising only ~2 of its ~6 advantages. Not a defect to fix on its own — it is the *framing* for F1, F4, F5, F10 and F21: completing those is what makes the split earn its keep. |

### 7.3 Moderate / hygiene

| # | Finding |
| --- | --- |
| **F10** | **Login wipes every other session** — `RefreshToken.deleteMany({ user })` before creating the new one. Signing in on a phone silently logs you out on your laptop. This may be intentional; if so it should be documented, and if not it should be `deleteOne` on the *old* jti. |
| ✅ **F11** | ~~**Cookie settings differ between flows** — password: `sameSite: "lax"`, 30 days; Google: `sameSite: "strict"`, 7 days. Also the Google cookie uses `maxAge` while login uses `expires`.~~ **Fixed** as a consequence of F1 — a shared issuer cannot emit two sets of flags. Both are now `sameSite: "lax"`, 30 days, `expires`. See [AUTH-FIX §2](./AUTH-FIX.md#2--f1--google-oauth-issued-tokens-with-the-wrong-claim-shape). |
| **F12** | **`/api/auth/change-password` has no caller in the UI** and doesn't handle Google-only accounts gracefully (they hit "Incorrect old password" because they have no password at all). |
| **F13** | **`RoleGuard` logs the full user object to the console on every render** (`console.log("Role guard triggered…", user)`) — PII in the production browser console. |
| **F14** | **Registration doesn't enforce username uniqueness** (no unique index, no check), while the admin create-user path does check it. Inconsistent. |
| **F15** | **Password policy is length ≥ 8 only.** `zxcvbn` is already a dependency (added for the vault) and could enforce real strength. |
| **F16** | **`middleware.ts` is deprecated in Next 16** — logs a warning on every boot; should become `proxy.ts`. |
| **F17** | **`/api/auth/me` returns the whole user document** (minus password), including `googleId`, `vaultSalt`, `vaultVerifier`. All safe by design, but broader than needed. |
| **F18** | **Auth boilerplate is duplicated in ~15 route handlers** rather than shared in one helper — the kind of drift that produced F1. |
| **F20** | **There is no "sign out of all devices".** Because `login`'s `deleteMany` guarantees at most one row per user, there is nothing to enumerate, so a global sign-out is not expressible today. See [§5.9](#59-session-lifecycle-across-devices). |
| **F21** | **Revocation has an up-to-15-minute lag.** Revoking a session deletes the allow-list row, but the already-issued access token stays valid until it expires, since it is never checked against the DB. Inherent to stateless access tokens; mitigable by shortening the TTL. |
| **F22** | **`deleteMany` → `create` in `login` is not atomic** (two separate awaits, no transaction). Two simultaneous logins can interleave and briefly leave two rows, or have one clobber the other. |
| **F23** | **No "remember me" — and no way to opt out of being remembered.** `login` hardcodes `REFRESH_TOKEN_EXPIRATION_DAYS = 30` and always sets a *persistent* cookie, so every sign-in (including on a shared or public machine) persists for 30 days. **v1: cookie-only opt-out** (session cookie when unchecked); **server-enforced expiry deferred to v2.** See [§9.1](#91-designing-remember-me-under-option-a). |
| **F24** | **Operational note, not a vulnerability — no signing-key rotation support.** `JWT_SECRET` / `JWT_REFRESH_SECRET` are single static values with no `kid` claim and no multi-key verification, so rotating either logs every user out at once. Only relevant for *mundane* rotation (e.g. someone with env access leaves). **Explicitly not a threat model:** secret compromise is not a scenario this design should be expected to mitigate — `MONGODB_URI` lives in the same `.env.local`, so anything that leaks the signing key also surrenders the database, and an attacker who owns the datastore can read everything and insert their own session rows regardless of architecture. Revocation is meaningless when the attacker controls the revocation table. (Minor asymmetry: Atlas is IP-allowlisted, so the DB URI carries a network-level second factor the signing key does not — but the correct response to a leaked key is still rotate-and-force-relogin.) |
| **F25** | **The interceptor's `/api/auth/me` skip is implicitly coupled to a single call site.** It is correct only because `/me` is called exactly once, immediately after a successful refresh. Nothing documents or enforces that. Add a `/me` call anywhere else — a profile re-fetch, a settings reload — and past the 15-minute access-token window it will 401 and **fail hard instead of transparently recovering**, with a non-obvious cause. Since `_retry` already prevents loops, prefer narrowing the skip-list to `/refresh` + `/login` (dropping `/me` and the dead `/register` entry), or comment the assumption explicitly. Minor related wart: `_retry` is set *before* the skip-list check, so skipped requests are marked retried despite never being retried. |

---

### 7.4 Architectural assessment: is the split-token model earning its keep?

A split access/refresh design is not free — it costs two token types, two
secrets, a response interceptor with retry, refresh de-duplication, a
bootstrap round-trip on every page load, an event bus for refresh failure, and a
server-side allow-list. That cost is worth paying **only if the resulting
advantages are actually realised.** Audited one by one:

| # | Advantage of split-token | Realised here? | Notes |
| --- | --- | --- | --- |
| 1 | Short-lived access token limits the value of a leak | ✅ **Yes** | 15 minutes. Genuine. |
| 2 | Long-lived credential is `httpOnly`, so XSS cannot steal it | ✅ **Yes** | The single most valuable property, and it is correctly implemented. |
| 3 | Server-side revocation (which stateless JWT alone cannot do) | 🟡 **Partly** | The allow-list works, but revocation lags by up to the access-token TTL (F21), and only for the password flow (F1). |
| 4 | Stateless auth — no DB round-trip per request | ❌ **No** | Nearly every protected route immediately calls `User.findById(payload.userId)`, so a DB hit happens anyway. The statelessness is paid for but not banked. |
| 5 | Rotation + reuse detection turns token theft into a *detectable* event | ❌ **No** | No rotation at all (F4). This is the biggest security win of the model, entirely unrealised. |
| 6 | Bearer tokens serve non-browser clients (mobile, CLI, third-party API) | ❌ **N/A** | There is one first-party web client on the same origin. Nothing consumes bearer tokens externally. |

**Score: 2 clear, 1 partial, 3 unrealised.** The conclusion is uncomfortable but
fair: *the current design pays the full complexity cost of split tokens while
capturing mostly the benefits that a plain session cookie would also have given.*

It is worth being precise about **why** this matters rather than treating it as
mere inelegance — the added machinery is exactly where the defects clustered:

- **F1** (Google sign-in broken) is a *token-shape drift* bug. It is only
  possible because there are two token types with two independently written
  signing sites.
- **F10 / F20** (single-session, no global sign-out) come from the allow-list
  being managed ad hoc at one call site.
- The `401` on every anonymous page load is the bootstrap round-trip that
  exists only because the access token cannot survive a reload.

#### The counter-argument (why "just use one token" is not automatically right)

Advantages 1 and 2 are real and should not be discarded. A naive "single token"
migration that puts a JWT in `localStorage` would be **strictly worse than what
exists today** — it would hand a long-lived credential to any XSS. "Single
token" is only an improvement if it means **an `httpOnly` session cookie**.

Note also that a session cookie would give *stronger* revocation than the
current design, not weaker: with the session looked up per request, a logout
takes effect on the very next request instead of up to 15 minutes later (F21).
Since the app already performs a DB read per request (row 4 above), this costs
essentially nothing.

#### Two coherent destinations

The current state is neither. Pick one deliberately.

**Option A — finish the split.** Keep both tokens and actually collect the
benefits: shared session-issuing function (fixes F1/F11), rotation with reuse
detection (F4), per-device rows (F10/F20), shorter access TTL to narrow the
revocation gap (F21).

- *Best if:* a mobile app, CLI, or public API is on the roadmap.
- *Cost:* moderate — the plumbing already exists; changes are concentrated in
  `login`, `google`, `refresh` and `lib/auth.ts`.

**Option B — collapse to one `httpOnly` session cookie.** An opaque session id
(or a JWT) in a single cookie, with a server-side session table and sliding
expiry.

- *Gains:* immediate and complete revocation; no interceptor, no refresh dedupe,
  no bootstrap round-trip, no event bus, no dual secrets, and F1's entire bug
  class becomes impossible.
- *Loses:* bearer-token support for non-browser clients — currently unused.
- *Cost:* higher — touches all ~15 route handlers plus the whole client auth
  layer.

#### Decision — Option A (settled)

**Option A was chosen and Option B is not being pursued.** See
[§9](#9-recommendations-prioritised) for the authoritative record; the analysis
above is retained only as the reasoning behind it.

The rationale was pragmatic rather than ideological: the infrastructure already
exists, fixes F1–F5 are already scoped against it, and it keeps the door open for
a non-web client. Most of Option B's advantage over a *finished* Option A is the
revocation lag (F21), which can be bought down cheaply by reducing the
access-token TTL (15 min → ~5 min) without rewriting anything.

> The conclusion of this section is therefore **not** "pick one" — it is "the
> split-token model is sound but *unfinished*, and the work below finishes it."

---

## 8. What is done well

These are deliberate, correct choices and should be preserved:

- **Access token in memory, refresh token in an `httpOnly` cookie.** This is the
  right split. XSS cannot exfiltrate the long-lived credential.
- **Separate secrets** for access and refresh tokens.
- **Server-side allow-list with `jti`** — real revocation, which stateless JWT
  schemes cannot do. Logout genuinely invalidates.
- **The refresh token is never persisted — not raw, and not hashed.** Only the
  `jti` (a CSPRNG `randomUUID()`) is stored, as a revocation handle. *Checked
  explicitly:* the "store a hash, never the token" rule applies to **opaque**
  token designs, where the token itself is the credential the server must
  validate against storage. Here validity comes from the HMAC signature over
  `JWT_REFRESH_SECRET`, so a leaked `jti` is useless without the secret — there
  is no credential in the database to hash. Hashing the `jti` would add nothing.

  *The natural follow-up — "then how does the server know the incoming token is
  the same one the row refers to?"* — is answered by the signature, not by a
  comparison. The `jti` sits **inside the signed payload**, so a valid signature
  over `jti = X` proves this is the token minted with `jti = X`; producing a
  different token with that same `jti` requires the secret. The two checks divide
  cleanly: the **signature** establishes authenticity and integrity, the **row's
  existence** establishes revocation state. Opaque-token designs need a stored
  comparison because the comparison *is* their only verification; a signed JWT
  replaces that step rather than skipping it. (`jti` is a 122-bit
  `randomUUID()` with a `unique` index, so collisions are not a concern.)
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

### Architecture decision — SETTLED

> **Decided: Option A — finish the split-token model.** Both tokens stay; the
> work is to actually collect the benefits (shared session issuer, rotation with
> reuse detection, per-device rows, shorter access TTL). Option B (collapsing to
> a single `httpOnly` session cookie) is explicitly **not** being pursued.
> Everything below assumes Option A.
>
> This resolves **F19** as a *decision*. F19 has no action item of its own — it
> is the framing for items 1, 6, 7 and 9, and is discharged when those land.

### Do first (correctness / security)

1. ✅ **DONE — Fix the Google route (F1).** ~~Delete the hand-rolled `jwt.sign`
   calls and use `generateAccessToken({ userId, email })` /
   `generateRefreshToken({ userId })`, then persist the `jti` to `RefreshToken`
   and set the cookie exactly as `login` does.~~ Done, and the suggested shared
   "issue a session" function was extracted — `issueSession()` in
   [`lib/session.ts`](../lib/session.ts) — so the two paths cannot drift again.
   See [AUTH-FIX §2](./AUTH-FIX.md#2--f1--google-oauth-issued-tokens-with-the-wrong-claim-shape).
2. ✅ **DONE — Check `email_verified` (F2)** ~~before creating *or linking* a
   Google account. Refuse, or require a password challenge, when linking to an
   existing account.~~ Unverified Google addresses are refused (`403`), and
   linking onto an existing account is refused (`409`) unless that account's own
   `emailVerified` is true. A password challenge was considered and rejected in
   favour of the `emailVerified` flag, which the v2 OTP flow
   ([§9.2](#92-email-verification-otp--v2)) sets without any extra UI.
   See [AUTH-FIX §3](./AUTH-FIX.md#3--f2--google-account-linking-did-not-check-email_verified).
3. ✅ **DONE — Validate token payload shape at runtime (F8)** — ~~have
   `verifyAccessToken` return `null` unless `userId` is a non-empty string.~~
   Both verifiers now reject any payload whose claims are the wrong shape.
   See [AUTH-FIX §1](./AUTH-FIX.md#1--f8--token-payload-shape-was-never-validated-at-runtime).
4. **Revoke sessions on password change (F5)** — `RefreshToken.deleteMany({ user })`
   inside `change-password`, and clear the caller's cookie.
5. **Set `GOOGLE_CLIENT_SECRET` (F3)** or hide the Google buttons when it is absent.
6. **Drop `deleteMany` from `login` (F10)** so sessions become genuinely
   per-device — the `RefreshToken` schema already supports multiple rows per
   user, so nothing else has to change. Then add an explicit
   **"sign out of all devices"** action (F20) that performs the `deleteMany`,
   and call it from `change-password` (F5). Consider a session cap (e.g. keep
   the 5 most recent) rather than unbounded rows, and make the
   delete-then-create atomic (F22).

### Do next (hardening)

7. **Refresh-token rotation with reuse detection (F4):** issue a new `jti` on
   every refresh, delete the old row, and if an *already-used* jti is presented,
   treat it as theft and revoke that user's whole token family.
   **Must ship with an `absoluteExpiresAt` hard cap** — set once at login, copied
   forward unchanged by each rotation, never extended. Without it, rotation
   slides `expires` forward on every use and *every* session becomes immortal for
   any user who returns within the window. See
   [§9.1](#91-designing-remember-me-under-option-a).
8. **"Remember me", v1 (F23):** add the checkbox (defaulting to checked), send a
   **boolean** (never a duration), and vary only the cookie — persistent when
   checked, session-only when not. The row stays 30 days either way. Store
   `rememberMe` on the row so rotation re-issues the cookie in the same mode
   instead of silently promoting a session cookie to persistent.
   Server-enforced expiry is **deferred to v2** — see [§9.1](#91-designing-remember-me-under-option-a).
9. **Shorten the access-token TTL (F21)**, 15 min → ~5 min, to buy down the
   revocation lag cheaply. The refresh flow already makes this transparent.
10. **Rate limiting (F6)** on `login`/`register`/`refresh` — per-IP and per-account.
11. **Constant-time login (F7):** run a dummy bcrypt compare when the user is not
    found, and make `register` respond identically whether or not the email exists
    (send a "check your inbox" style response instead of `409`).
12. **Extract one `requireAuth(req)` / `requireAdmin(req)` helper (F18)** and use
    it in every route handler.
13. **Widen the middleware matcher (F9)** to all private routes, or drop the
    middleware layer entirely and rely on `RoleGuard` + API enforcement — but
    pick one deliberately.

### Cleanup

14. Remove the `RoleGuard` console logging (F13).
15. ✅ **DONE** — ~~Align cookie flags between the two login paths (F11).~~
    Fell out of the F1 shared-issuer extraction.
16. Rename `middleware.ts` → `proxy.ts` for Next 16 (F16).
17. Narrow the axios skip-list to `/refresh` + `/login` (F25), dropping the `/me`
    coupling and the dead `/register` entry.
18. Give `change-password` a UI caller, and handle Google-only accounts
    explicitly rather than reporting "Incorrect old password" (F12).
19. Add `zxcvbn` strength gating at registration (F15); enforce username
    uniqueness or drop the notion (F14).
20. Trim `/api/auth/me` to the fields the client actually uses (F17).

### Not scheduled

- **F24** (no signing-key rotation support) is an operational note, not a
  vulnerability. Revisit only if a mundane key rotation is ever needed.

---

### 9.1 Designing "remember me" under Option A

There are two levers: the **cookie's** persistence (browser-side) and the
**refresh-token row's** lifetime (server-side). They sit at different layers, so
they can be set independently.

#### Chosen approach

**The refresh token keeps its 30-day lifetime server-side in every case. Only the
cookie changes:** persistent (`expires` set) when "remember me" is checked,
**session-only** (no `expires`, no `maxAge`) when it is not, so the browser drops
it on close. One lifetime constant, one code path, and the DB row stays
revocable either way.

| Setting | Cookie | DB row |
| --- | --- | --- |
| Remember me **on** | persistent, `expires` +30d | 30 days |
| Remember me **off** | **session cookie** — no `expires`/`maxAge` | 30 days |

#### What this does and does not guarantee

The cookie change is a **browser-side, advisory** control. It is the only thing
enforcing the user's choice, and it is the one component we do not control:

- **Mobile is the weak point.** On iOS/Android "closing the browser" rarely
  terminates the process — tabs are backgrounded — so session cookies can
  survive for weeks. Unchecking the box is close to a no-op there.
- **Desktop session restore.** Chrome/Edge "Continue where you left off",
  Firefox "Restore previous session", and Chrome's crash recovery all restore
  session cookies.

In both cases the user believes they are signed out and they are not, and
because the row is still valid for 30 days there is no backstop.

#### v1 scope — ship the simple version

**Decision: v1 ships the cookie-only behaviour above. No server-side TTL
variance between remembered and non-remembered sessions.** The row is 30 days in
both cases. "Don't remember me" is therefore a **UI affordance backed by browser
behaviour, not a server-enforced property**, and that is accepted for v1.

A shorter *sliding* idle window for non-remembered sessions
(`rememberMe ? 30d : 12h`) was considered and **rejected** — it does not
actually solve the case it was aimed at:

> A sliding window only expires a session that is abandoned for the *entire*
> window. Any return inside it — including a backgrounded mobile tab that wakes
> and triggers a refresh — pushes it forward again, indefinitely. It would have
> covered only the "untouched for >12h" case, not the mobile-session-cookie
> scenario that motivated it.

The insight generalises: **a sliding window is a UX convenience, not a security
control. The load-bearing piece is an absolute cap.**

#### 🔜 Deferred to v2

> **v2 carries two pieces of work, and they ship together:** the server-enforced
> "remember me" below, and **email verification by OTP**
> ([§9.2](#92-email-verification-otp--v2)), which is stage 2 of the F2 fix.
> They are independent in mechanism but share a release.

Proper enforcement of "don't remember me", to be designed then:

- A **server-side idle TTL, slid on use**, *paired with an absolute cap* — the
  cap is what makes it enforceable, per the note above.
- Revisit whether non-remembered sessions should get a distinct, short absolute
  lifetime (e.g. 24h) rather than inheriting the 30-day one. This is the option
  that would genuinely close the mobile hole, at the cost of signing users out
  on a fixed schedule.
- Decide the desired behaviour on mobile specifically, where "closing the
  browser" is not an observable event.

> **Not deferred:** `absoluteExpiresAt` itself (see the two-clock problem below)
> belongs to the **rotation** work in F4, not to remember-me. If rotation ships
> in v1, the cap must ship with it — without one, *every* session becomes
> immortal for any user who returns within the window, remembered or not.

#### The two-clock problem (belongs to rotation / F4, not to remember-me)

This one is **not deferred** — it is a property of rotation itself and applies to
every session, remembered or not. If each rotation resets `expires` to
`now + 30d`, then any user who returns at least monthly is **never** logged out:
the session becomes immortal, and "30 days" quietly means "forever."

The fix is to track **two independent clocks** per session row:

- `expires` — the *sliding* idle window. Moves forward on every rotation. The
  existing TTL index on this field keeps cleaning up abandoned sessions.
- `absoluteExpiresAt` — a *hard cap*, set once at login and **copied forward
  unchanged** by every rotation. Never extended.

`/api/auth/refresh` must reject when `now > absoluteExpiresAt` even if the
sliding window is still open. That is what makes "30 days" actually mean 30 days.

#### Rotation must preserve the cookie mode

Rotation re-issues the cookie. If the rotation code does not know the original
was a *session* cookie, it will set a *persistent* one and silently upgrade the
user to "remembered" without consent. The mode therefore has to live on the
session row, not just in the original request.

#### Schema additions to `RefreshToken`

```
rememberMe:        Boolean   // so rotation re-issues the cookie in the same mode
absoluteExpiresAt: Date      // hard cap; copied forward on rotation, never extended
expires:           Date      // (existing) sliding idle window + TTL index
```

Per-device rows (the F10 fix) compose correctly with this: each device carries
its own remember-me mode and its own pair of clocks.

#### Security note

The client sends a **boolean**, never a duration. The server maps
`rememberMe: true|false` onto the lifetimes above. Accepting a client-supplied
expiry would let anyone mint a self-extending session.

#### Interaction with the encrypted vault (favourable)

The vault key is held in memory only and is cleared on every page load
(see `ENCRYPTED_VAULT.md`). Remember-me therefore extends **authentication
only — never vault access**: a remembered session still cannot read encrypted
documents without the passphrase being re-entered. This materially lowers the
risk of defaulting the checkbox to *checked*. Note it does still grant access to
all *plaintext* links and documents.

#### Where the changes land

1. `app/(public)/login/page.tsx` — the checkbox.
2. `hooks/useAuth.tsx` — `login(email, password, rememberMe)`.
3. `app/api/auth/login/route.ts` — read the boolean, pick lifetimes, set the
   cookie with or without `expires`.
4. `models/RefreshToken.ts` — the two new fields above.
5. `app/api/auth/refresh/route.ts` — enforce the absolute cap; on rotation copy
   `absoluteExpiresAt` forward and re-issue the cookie in the stored mode.
6. The shared session-issuing function (F1) — so the Google path gets identical
   treatment; decide its default (OAuth logins are conventionally remembered).

---

### 9.2 Email verification (OTP) — v2

**Status: deferred to v2, alongside the server-enforced "remember me" in
[§9.1](#91-designing-remember-me-under-option-a).** This is **stage 2 of the F2
fix**; stage 1 shipped (see [AUTH-FIX §3](./AUTH-FIX.md#3--f2--google-account-linking-did-not-check-email_verified)).

#### Why it is needed

`register` accepts any email address without proving the registrant controls it.
That is the root cause behind the second direction of
[F2](#-f2--google-account-linking-does-not-check-email_verified--fixed): the
local side of an email match is unproven, so Google's verified claim is not
enough on its own to make auto-linking safe.

Stage 1 handles this by refusing to link onto any account with
`emailVerified: false` — which today means *every* password account. OTP is what
makes that flag reachable for password users, at which point the refusal relaxes
by itself. **No change to the Google route is required when this lands.**

It also pays down two other findings:

- **F7 (user enumeration)** — `register` can stop returning `409 "Email already
  in use"` and respond identically either way, because the real signal goes to
  the inbox instead of the HTTP response.
- **Password reset**, which the app does not have at all, needs exactly the same
  mail infrastructure.

#### Decided

| Question | Decision |
| --- | --- |
| OTP code or magic link? | **OTP code.** Better on mobile than switching apps to click a link. |
| Existing accounts | **Force verification**, not grandfathered — grandfathering would keep the hole open permanently for the oldest accounts. Low cost here: at time of writing all accounts are the developer's own test accounts. |
| Mail provider | **Resend.** Credentials not yet issued. |

#### Scope

Not a small change, which is why it is not part of the F2 fix:

- Mail provider wired up — API key in env, and SPF/DKIM on the sending domain or
  the mail lands in spam.
- Schema: hashed OTP, expiry, and an **attempt counter**.
- Endpoints: `verify-otp`, `resend-otp`.
- A verify step in the registration flow, plus resend handling.
- **Attempt limiting is mandatory, not optional.** A 6-digit code is a 10⁶
  space; with unlimited guesses it falls in minutes. Since
  [F6](#72-important) (no rate limiting) is still open, this work must ship its
  own per-account attempt cap or the OTP is decorative.
- `login` must decide what an unverified account may do — refuse outright, or
  allow a restricted session. Otherwise verification is cosmetic.

---

## 10. Endpoint reference

| Method & path | Auth required | Body | Success | Failure modes |
| --- | --- | --- | --- | --- |
| `POST /api/auth/register` | — | `{username, email, password}` | `201 {message}` | `400` missing/short password · `409` email taken |
| `POST /api/auth/login` | — | `{email, password}` | `200 {user, accessToken}` + cookie | `400` missing · `401` bad credentials |
| `POST /api/auth/refresh` | cookie | — | `200 {accessToken}` | `401` absent/invalid/revoked/expired · `404` user gone |
| `POST /api/auth/logout` | cookie (optional) | — | `200 {message}` | always clears the cookie |
| `GET /api/auth/me` | Bearer | — | `200 <user minus password>` | `401` · `404` |
| `POST /api/auth/google` | — | `{code}` | `200 {accessToken, user}` + cookie | `400` no code/payload · `403` `GOOGLE_EMAIL_UNVERIFIED` · `409` `PASSWORD_ACCOUNT_EXISTS` · `500` exchange failed |
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
