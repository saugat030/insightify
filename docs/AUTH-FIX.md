# Authentication — Fix Log

> A running record of the findings in [`AUTHENTICATION.md`](./AUTHENTICATION.md)
> as they are addressed, in the order they were fixed. Each entry is short by
> design: what was wrong, what changed, and how it was verified. The full
> analysis of each finding stays in `AUTHENTICATION.md`.

Findings that have been fixed are marked ✅ in `AUTHENTICATION.md` so open work
is easy to tell apart from closed work at a glance.

| # | Finding | Title | Status |
| --- | --- | --- | --- |
| 1 | **F8** | `verifyAccessToken` casts instead of validating | ✅ Fixed |
| 2 | **F1** | Google OAuth issued tokens with the wrong claim shape | ✅ Fixed |
| 2 | **F11** | Cookie flags differed between the two login paths | ✅ Fixed — fell out of F1 |
| 3 | **F2** | Google account linking did not check `email_verified` | ✅ Fixed (stage 1 of 2 — see entry) |
| 4 | **F5** | Password change did not revoke sessions | ✅ Fixed |
| 4 | **F10** | Login wiped every other session | ✅ Fixed |
| 4 | **F20** | No "sign out of all devices" | ✅ Fixed |
| 4 | **F22** | `deleteMany` → `create` in login was not atomic | ✅ Dissolved by the F10 fix |
| 5 | **F18** | Auth boilerplate duplicated across ~15 route handlers | ✅ Fixed |
| 5 | **F21** | Revocation lagged up to 15 minutes | ✅ Fixed for global revocation |
| 6 | **F4** | No refresh-token rotation or reuse detection | ✅ Fixed |

---

## 1 — F8 · Token payload shape was never validated at runtime

**File:** [`lib/auth.ts`](../lib/auth.ts)

### The issue

Both verifiers ended in a TypeScript cast:

```ts
return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
```

A cast is a compile-time assertion over a runtime value — it checks nothing. A
valid signature proves only that *we* minted the token; it says nothing about
which claim names are inside it. So a token signed with our own secret but
carrying different claims passed verification cleanly and then read back as
`undefined` deep inside the route handlers.

This is the root cause that let **F1** ship silently: the Google route
hand-rolls `jwt.sign({ id, role })`, so every protected endpoint ran
`User.findById(undefined)` and returned a misleading `404 User not found`
instead of failing at the auth boundary.

There was a second, quieter reason to fix this. F1 is *not* an authentication
bypass, but the analysis in `AUTHENTICATION.md` §7.1 attributed that to Mongoose
retaining `undefined` keys. Testing showed the real mechanism is the MongoDB
driver's `ignoreUndefined` option, which defaults to `false` and so serialises
`undefined` → `null`:

```
BSON ignoreUndefined:false  ->  { jti: null, user: null }   ← what ships today
BSON ignoreUndefined:true   ->  { }                         ← would match any row
```

`lib/db.ts` passes only `bufferCommands: false`, so the safe default holds — but
"this is not a bypass" was resting on a connection option nobody had written
down. Validating the payload removes that dependency entirely.

### The fix

Two type guards, applied before either verifier returns:

- `isAccessTokenPayload` — requires `userId` **and** `email` to be non-empty
  strings.
- `isRefreshTokenPayload` — requires `userId` **and** `jti` to be non-empty
  strings.

A failing check returns `null`, which every call site already handles as
`401 Unauthorized`, and logs a `console.warn` naming the **claim keys only**
(never their values, which are user identifiers) so drift is diagnosable from
the server log.

Also tightened, in the same spirit: `generateAccessToken` and
`generateRefreshToken` now wrap `userId` in `String()`. Callers pass a Mongoose
`ObjectId`, which previously became a string only as a side effect of
`jwt.sign`'s JSON serialisation. It is now explicit, so the guards cannot be
tripped by a caller's argument type.

### Verification

`npx tsc --noEmit` clean. Exercised against the real `lib/auth.ts` with the
project's actual secrets:

| Token | Before | After |
| --- | --- | --- |
| Login-flow access token `{userId, email}` | accepted | **accepted** (unchanged) |
| Login-flow refresh token `{userId, jti}` | accepted, `jti` round-trips | **accepted** (unchanged) |
| Google-flow access token `{id, role}` | **accepted**, `userId` → `undefined` | **rejected** → `null` |
| Google-flow refresh token `{id, role}` | **accepted**, `jti` → `undefined` | **rejected** → `null` |
| `userId: ""` | accepted | **rejected** |
| Signed with the wrong secret | rejected | rejected |
| Malformed string | rejected | rejected |

### Blast radius

None for the working password flow — its tokens already conform, and the
round-trip test confirms they are untouched. The Google flow changes from one
broken failure mode to another, better one: a `404 User not found` from a
downstream DB lookup becomes a `401` at the auth boundary, with a log line
naming the offending claims. F1 remains open and is the next fix.

---

## 2 — F1 · Google OAuth issued tokens with the wrong claim shape

**Files:** [`lib/session.ts`](../lib/session.ts) (new),
[`app/api/auth/google/route.ts`](../app/api/auth/google/route.ts),
[`app/api/auth/login/route.ts`](../app/api/auth/login/route.ts)

*Closes **F11** in the same change — see below.*

### The issue

The Google route hand-rolled its own JWTs instead of using `lib/auth.ts`, with
different claim names and a different cookie:

```ts
jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET!,         { expiresIn: "15m" })
jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d"  })
```

Three consequences, all of which made Google sign-in unusable:

1. Every protected route reads `payload.userId`, which was `undefined` here, so
   `User.findById(undefined)` returned `null` → `404 User not found`. A
   Google-authenticated user could call **no** protected API.
2. The refresh token carried no `jti` and was never written to the
   `RefreshToken` allow-list, so `/api/auth/refresh` returned
   `401 Token has been revoked`. Since `AuthProvider` refreshes on mount, the
   session died at the first page reload.
3. Logout could not revoke a Google session — `deleteOne({ jti: undefined })`
   matched nothing.

Separately (**F11**), the two flows set materially different cookies: the
password flow `sameSite: "lax"` / 30 days / `expires`, the Google flow
`sameSite: "strict"` / 7 days / `maxAge`.

### The fix

Both defects share one root cause — *two independently written session-issuing
sites* — so the fix removes the second site rather than correcting it.

New `lib/session.ts` exports `issueSession(user)`, the single place a session is
minted. It generates both tokens through `lib/auth.ts`, writes the `jti`
allow-list row, sets the cookie, and returns the access token. `login` and
`google` now each call it and do nothing else token-related.

F11 is closed by construction: one issuer cannot emit two sets of cookie flags.
The surviving values are the password flow's — `httpOnly`, `secure` in
production, `path: "/"`, `sameSite: "lax"`, `expires` at +30 days.

Deliberately **not** changed: `issueSession` keeps the
`RefreshToken.deleteMany({ user })` that makes the app single-session. That is
**F10**, still open, and moving it here would have buried a behaviour change
inside a correctness fix. The effect is that Google logins now inherit the same
single-session semantics the password flow already had. The line is commented as
such in the source.

### Verification

`npx tsc --noEmit` clean; `npx next build` succeeds with all 19 API routes
compiled. Token shape checked against the real `lib/auth.ts` using a genuine
Mongoose `ObjectId` as `user._id`:

| Check | Before | After |
| --- | --- | --- |
| `verifyAccessToken(...).userId` | `undefined` | the real id, `6aa668bb…` |
| `verifyRefreshToken(...).jti` | `undefined` | matches the allow-list row |
| `verifyRefreshToken(...).userId` | `undefined` | the real id |
| Hand-rolled `jwt.sign` in the Google route | 2 calls | none |

Note that the F8 guards now also *enforce* this: had the Google route kept its
old shape, `verifyAccessToken` would reject it outright rather than passing an
`undefined` downstream.

### ⚠️ This fix escalates F2 — read before configuring Google

While Google sign-in was broken, **F2** (account linking never checks the
`email_verified` claim) was unreachable. It is now reachable. The flow links a
Google identity onto any existing account matching the email, with no proof of
the password — the classic pre-account-takeover vector.

The only thing still preventing this from being live is **F3**: without
`GOOGLE_CLIENT_SECRET`, `oAuth2Client.getToken(code)` fails before any of this
code runs. **F2 must land before that secret is set.** It is the next fix.

### Blast radius

The password flow is behaviourally identical apart from the code now living in
`lib/session.ts` — same claims, same cookie, same allow-list writes. The Google
flow changes from broken to correct, but **remains untestable end to end** until
F3 is resolved, so it is verified at the unit level only and should be treated
as unproven against a live Google response.

---

## 3 — F2 · Google account linking did not check `email_verified`

**Files:** [`app/api/auth/google/route.ts`](../app/api/auth/google/route.ts),
[`models/User.ts`](../models/User.ts)

### The issue

The route destructured `email`, `name`, `picture` and `sub` from the verified ID
token and ignored `email_verified` entirely, then linked `googleId` onto any
existing account matching the email. That is the classic pre-account-takeover
linking vector: obtain an ID token for an unverified address that matches a
password account, and the flow grants full access with no proof of the password.

**F2 has a second direction the original review did not record.** Checking
`email_verified` alone does *not* close it, because the local side of the email
match is unproven too — `register` never verifies email ownership:

1. Attacker registers a password account for `victim@gmail.com`. The app accepts
   it; nothing checks the address.
2. Victim clicks "Sign in with Google". Google legitimately reports
   `email_verified: true`.
3. The route finds the existing account and links `googleId` onto it.
4. The victim is now working inside an account whose password the attacker
   chose, and the attacker can sign into it whenever they like.

`email_verified` is `true` at every step. The check passes and the takeover
still happens. What is actually required is proof from *both* sides.

### The fix — stage 1 of 2

New field on `User`:

```
emailVerified: Boolean (default false)
```

Google sign-ups set it `true` — the ID token is Google's proof. Password
sign-ups stay `false`, because nothing proves the address yet. Three rules in
the Google route follow from it:

| Situation | Behaviour |
| --- | --- |
| `email_verified !== true` | `403 GOOGLE_EMAIL_UNVERIFIED` — refuse before touching the DB |
| No account for this email | Create it with `emailVerified: true` |
| Account exists, no `googleId`, `emailVerified: false` | `409 PASSWORD_ACCOUNT_EXISTS` — refuse to link |
| Account exists, no `googleId`, `emailVerified: true` | Link `googleId`, sign in |
| Account already has `googleId` | Sign in; backfill `emailVerified` if unset |

Both error messages reach the user verbatim — `useAuth.googleLogin` rethrows
`response.data.error` and the login and register pages render it.

Because every existing password account is `emailVerified: false`, the practical
effect **today** is that Google sign-in never links onto a password account. That
is intended, and it is why this is stage 1 rather than the whole fix.

### Why this is not throwaway work

Stage 2 is the **v2 OTP flow** (see
[AUTHENTICATION §9.2](./AUTHENTICATION.md#92-email-verification-otp--v2)), which
sets `emailVerified: true` once the user enters a code sent to their inbox.

When it lands, **none of the rules above change.** They already read
`emailVerified`. Verified accounts simply begin auto-linking; accounts that have
not verified keep receiving the `409`. The condition goes from "always refuse"
to "refuse only unverified" without the Google route being touched again.

### Verification

`npx tsc --noEmit` clean; `npx next build` compiles. Field defaults checked
against the real `models/User.ts`:

| Constructed as | `emailVerified` |
| --- | --- |
| Password signup | `false` |
| Google signup (as the route builds it) | `true` |
| Legacy document predating the field | `false` |

So both the password path and every pre-existing document are refused for
linking, which is the intent.

**Not verified end to end.** `GOOGLE_CLIENT_SECRET` is unset in development
(F3), so `getToken(code)` still fails before any of this runs. The branch
behaviour above is read off the code and the schema defaults are tested; the
live Google response is not exercised. Treat it as unproven until the secret is
configured in an environment where it can be exercised.

### Blast radius

The password flow is untouched. New Google users sign up normally. Existing
Google-linked users sign in normally and get `emailVerified` backfilled. The one
behaviour change is that a user who registered with a password and then clicks
"Sign in with Google" now gets a clear error instead of being silently linked —
correct until their address is proven, and self-resolving once OTP ships.

---

## 4 — F5, F10, F20 · Session management: per-device sessions, sign-out-everywhere, and revocation on password change

**Files:** [`lib/session.ts`](../lib/session.ts),
[`app/api/auth/logout-all/route.ts`](../app/api/auth/logout-all/route.ts) (new),
[`app/api/auth/logout/route.ts`](../app/api/auth/logout/route.ts),
[`app/api/auth/change-password/route.ts`](../app/api/auth/change-password/route.ts),
[`hooks/useAuth.tsx`](../hooks/useAuth.tsx)

*Also closes **F22**, which dissolved rather than being fixed — see below.*

These three were taken as one pass because they are the same problem seen from
three angles: the session table was being managed ad hoc at a single call site,
so it could express exactly one session per user and nothing else.

### The issues

**F10 — login wiped every other session.** `issueSession()` ran
`RefreshToken.deleteMany({ user })` before creating its own row, so at most one
row could exist per user. Signing in on a phone silently signed you out on your
laptop, with no indication until the laptop's next refresh.

**F20 — no "sign out of all devices".** Not a missing button so much as a
missing *capability*: with at most one row per user there was nothing to
enumerate, so a global sign-out could not be expressed.

**F5 — a password change revoked nothing.** `change-password` never touched
`RefreshToken`, so an attacker holding a stolen refresh token kept access
through the exact action taken to lock them out. This is the one that actually
mattered — it defeats the main reason people change passwords.

### The fix

`lib/session.ts` grew from one function into the session lifecycle:

| Export | Role |
| --- | --- |
| `issueSession(user)` | Mints a session. **No longer deletes anything.** |
| `revokeSession(jti)` | One device, by the handle in its own cookie. |
| `revokeAllSessions(userId)` | Every device. Returns the count. |
| `clearSessionCookie()` | Clears the caller's cookie. |

**F10:** the `deleteMany` is gone. Rows are per-device, and the schema already
supported this — nothing else had to change.

A **cap of 5 sessions per user** was added here as the review suggested, and
then **removed again before this work was committed** — see the revision note at
the end of this entry. Sessions are uncapped.

**F20:** `POST /api/auth/logout-all` (Bearer) revokes every row for the caller
and clears their cookie, exposed on the client as `useAuth().logoutAll()`.
This is only expressible *because* F10 made multiple rows possible.

**F5:** `change-password` now calls `revokeAllSessions()` after saving the new
password, then **issues the caller a fresh session**. This deviates from the
review's literal suggestion ("`deleteMany`, and clear the caller's cookie") on
purpose: clearing the cookie signs out the very person who just changed their
password. Re-issuing achieves the same security result — every other device is
dead — without that. The response carries the new `accessToken` and a
`revokedSessions` count.

`logout` was also refactored onto `revokeSession()` / `clearSessionCookie()`,
removing its duplicated cookie-name constant and inline query.

### Revision — the session cap was removed

The cap never rejected a login; it evicted the oldest row. But eviction was by
`createdAt`, and **age is not staleness** — a stable session is the oldest
precisely because it is stable. Two ordinary patterns break under it:

- **More than five real devices.** Past five, every login evicts one still in
  use, so the user is perpetually signed out of something. This never
  converges — it thrashes indefinitely.
- **Private windows mixed with a stable session.** Each private window gets its
  own cookie jar and its own row, and that row outlives the window until the
  30-day TTL. Five throwaway private logins are five rows *newer* than the phone
  that has worked for a month — so the phone is evicted by five sessions whose
  cookies no longer exist.

Removing it costs nothing: growth is already bounded by the TTL index, rows are
tiny, and no attack is prevented (rows come only from *successful* logins, so
anyone making them already has the credentials — brute force is F6's job). The
obvious repair, evicting by `lastUsedAt` instead, needs a write on every
refresh — the same cost that got the TTL reduction rejected in §5.

Worth revisiting once rotation (F4) lands: rotation makes refresh a write
anyway and keeps an active session at one row, so `lastUsedAt` eviction would be
free then — and it would evict the genuinely idle rather than the merely old.

### Why F22 dissolved

F22 was that `deleteMany` → `create` in login is two awaits with no transaction,
so concurrent logins could interleave. **Removing the `deleteMany` removed the
sequence.** Two simultaneous logins are now *supposed* to produce two rows, and with the cap
removed there is no pruning step to reconcile either. There is no window in
which a user ends up with no session.

### Verification

`npx tsc --noEmit` clean; `npx next build` compiles with `/api/auth/logout-all`
registered. Prune query checked against the real model — filter, `sort
{createdAt: -1}`, `skip 5`, and `createdAt` confirmed present on the schema.

**Not exercised against a live database.** Row-level behaviour — that pruning
keeps exactly the newest five, that `revokeAllSessions` returns the right count,
that a second device genuinely survives a first device's login — is reasoned
from the code, not observed. These are worth a manual pass once the app is
running against a real database.

### Blast radius

Behaviour changes users will notice, all intended:

- Signing in no longer signs you out elsewhere, with no limit on how many
  devices a user keeps signed in.
- Changing your password signs out every *other* device; the tab you did it in
  keeps working.

**Still open and directly related:** revocation lags by up to the access-token
TTL (**F21**) — a revoked device keeps working until its access token expires,
because access tokens are stateless and never checked against the DB. Sessions
are also not *enumerable* by the user: there is no "here are your 5 devices"
screen, only the all-or-nothing sign-out. And **no UI button** calls
`logoutAll()` yet, the same gap `change-password` has (**F12**).

---

## 5 — F18, F21 · One auth helper, and immediate global revocation

**Files:** [`lib/requireAuth.ts`](../lib/requireAuth.ts) (new),
[`models/User.ts`](../models/User.ts), [`lib/session.ts`](../lib/session.ts),
[`lib/auth.ts`](../lib/auth.ts), and 10 route files.

Taken together because F21's check has exactly one sensible home: inside the
helper F18 creates. Doing F21 first would have meant editing 15 call sites — the
same duplication that produced F1.

### The issues

**F18 — the auth preamble was copy-pasted 15 times.** Read the header, check the
`Bearer ` prefix, split on a space, verify, load the user, 404 if missing. Every
copy differed slightly: four distinct error messages for the same condition,
`"Authorization"` vs `"authorization"`, some checking the user existed and some
not. Two files had grown private helpers (`authUserId`, `checkAdmin`) that did
subtly different things. This is the drift that let F1 ship.

**F21 — revocation lagged up to 15 minutes.** Deleting the allow-list row killed
future *refreshes*, but the access token already in the attacker's hands stayed
valid until it expired, because nothing checked it against the database.

### The fix

`lib/requireAuth.ts` exports two functions returning a discriminated result, so
a caller either has a user or has a response to return:

```ts
const auth = await requireAuth(req);
if (!auth.ok) return auth.response;
const { user } = auth;        // also: auth.userId, auth.payload
```

`requireAdmin(req)` is `requireAuth` plus a role check. `change-password` passes
`{ withPassword: true }` for the one case needing the `select:false` field.

**F21** adds `User.sessionsRevokedAt`. `revokeAllSessions()` stamps it, and
`requireAuth()` rejects any token issued before it. Because the user document
was *already* being loaded, this costs **no extra query**.

The review's own suggestion — shorten the TTL to ~5 minutes — was **rejected**.
It triples refresh traffic, and once rotation (F4) turns every refresh into a
write, that cost lands on the write path. It also only moves the lag to 5
minutes; it never makes revocation immediate. `sessionsRevokedAt` is immediate
and free. The TTL stays at 15 minutes.

#### The `iat` precision trap

`iat` is second-precision, but `sessionsRevokedAt` is a millisecond `Date`.
`change-password` revokes and then *immediately* re-issues, so a naive
`iat * 1000 < sessionsRevokedAt` rejects the token it just minted. The check
compares whole seconds instead:

```ts
payload.iat < Math.floor(sessionsRevokedAt.getTime() / 1000)
```

A token minted in the same second as the revocation survives. The cost is a
sub-second window where a token issued just before revocation is still accepted,
which is the right trade against breaking the re-issue path.

A token carrying no `iat` at all is treated as stale — fail closed.

### What this deliberately does *not* cover

**Per-device logout still lags.** `sessionsRevokedAt` is per *user*, so it
catches the global cases — sign-out-everywhere and password change — which are
the ones that matter after a device is lost or an account is compromised. Making
single-device logout immediate would need the access token to carry its `jti`
and a `RefreshToken` read on every request. Not worth it; the remaining lag is
accepted and recorded in F21.

### Verification

`npx tsc --noEmit` clean; `npx next build` compiles. `verifyAccessToken` now has
**exactly one caller** in the codebase (`lib/requireAuth.ts`) — down from 15.
The staleness rule was tested directly across its edge cases:

| Case | Stale? |
| --- | --- |
| Never revoked | no |
| Token 1 hour before revocation | **yes** |
| Token 1 second before revocation | **yes** |
| Token in the *same second*, revoked at +500ms | no — the re-issue survives |
| Token 1 second after revocation | no |
| No `iat`, sessions revoked | **yes** — fail closed |
| No `iat`, never revoked | no |

**Not exercised against a live database.** The refactor's behaviour is
structural and type-checked, but that all 10 routes still behave identically
under real requests has not been observed. Given this touched every protected
endpoint, it is the change in this series most worth a manual smoke test.

### Blast radius

Error *messages* changed — four variants collapsed into
`"Unauthorized: No token provided"`, `"Unauthorized: Invalid or expired token"`,
`"Unauthorized: Session revoked"`, `"User not found"`, and
`"Forbidden: Admin access required"`. Status codes are unchanged, and nothing in
the client branches on message text; it only renders it.

Two routes — `links/[id]` and `markdown` — did not previously load the user and
now do, costing one indexed `_id` lookup each. That is the price of enforcing
revocation uniformly rather than in 12 of 16 files, and it is what makes F21's
guarantee hold everywhere instead of almost everywhere.

Narrow `.select()` projections in `vault`, `analytics` and `admin/analytics`
were dropped in favour of the full document. Mixing `+password` with an
inclusion projection is a Mongoose footgun, and the saving was negligible on a
single document.

---

## 6 — F4 · Refresh-token rotation with reuse detection

**Files:** [`app/api/auth/refresh/route.ts`](../app/api/auth/refresh/route.ts),
[`models/RefreshToken.ts`](../models/RefreshToken.ts),
[`lib/session.ts`](../lib/session.ts)

### The issue

One refresh token served a session for its entire 30-day life. A stolen token
was therefore valid for 30 days, and — the part that matters — its use was
**indistinguishable from the legitimate user's**. Nothing could ever notice.

The review called this "the biggest security win of the model, entirely
unrealised" (§7.4 row 5).

### The fix

Every refresh now mints a **new** refresh token with a new `jti` and retires the
old row. Four fields were added to `RefreshToken`:

| Field | Purpose |
| --- | --- |
| `family` | uuid, constant across every rotation of one login |
| `usedAt` | `null` = live; set = consumed |
| `replacedBy` | the `jti` that superseded it |
| `absoluteExpiresAt` | hard cap, copied forward, **never** extended |

`family` deliberately stays **out of the JWT** — it is read off the row — so the
token shape and the F8 guard are untouched.

#### Retiring, not deleting

Deleting the old row would make a replayed token look identical to a random
invalid one, so reuse *detection* would not exist. Rows are marked `usedAt`
instead, which gives four distinguishable outcomes:

| Row state | Meaning | Response |
| --- | --- | --- |
| no row | unknown/revoked token | `401` |
| past `absoluteExpiresAt` | session hit its hard cap | revoke family, `401` |
| `usedAt: null` | live | **rotate** |
| `usedAt` set, inside grace | losing tab of a concurrent refresh | access token only |
| `usedAt` set, outside grace | **reuse — theft** | revoke family, `401` |

#### Detection revokes the family, not every session

A stolen token belongs to one lineage. Killing all of a user's sessions would
mean a single false positive signs them out everywhere, and buys nothing against
the actual threat — other families would require a separate credential
compromise. This matches RFC 9700. `sessionsRevokedAt` is deliberately **not**
stamped, so the thief's current access token survives up to 15 minutes; that is
the same accepted limitation recorded in F21. One line to change if a harsher
policy is ever wanted.

#### The multi-tab trap

Two tabs share one cookie jar, so both can refresh with the same token. The
loser arrives holding a token the winner just consumed — identical to reuse.
Untreated, ordinary two-tab browsing fires the theft alarm and logs the user
out at random.

Within **60 seconds** of `usedAt`, a consumed token returns a fresh access token
but does **not** rotate and does **not** touch the cookie — the winner already
replaced it. The window is deliberately generous: a false theft alarm costs a
logout, a slightly wider replay window costs very little, and the grace path
issues **no refresh token**, so a thief cannot gain persistence through it.

The consume step is an atomic compare-and-set:

```ts
findOneAndUpdate({ _id: row._id, usedAt: null }, { usedAt: now, replacedBy: nextJti })
```

so two simultaneous refreshes cannot both rotate. Losing that race falls into
the same grace path.

#### The two-clock problem

Without a cap, rotation slides `expires` forward on every use and any user who
returns within the window is **never** logged out — "30 days" quietly means
"forever." `absoluteExpiresAt` is set once at login and copied forward
unchanged; refresh rejects on it even when the sliding window is open.

**No sliding idle window in v1.** Per AUTHENTICATION §9.1 the idle TTL is
explicitly v2 work, so `expires` and `absoluteExpiresAt` are equal for now. v2
gives `expires` a shorter sliding value and the cap keeps meaning what it says.
`rememberMe` is **not** added here — v2 adds it beside these fields without
reshaping the row.

#### Legacy rows

Rows written before this change have no `family`, `usedAt` or
`absoluteExpiresAt`. The cap falls back to `row.expires`, which for them is
already login + 30 days — exactly right. `{ usedAt: null }` matches a missing
field in MongoDB, so they read as live and rotate normally on first use.

`revokeFamily()` is guarded against a non-string family, because
`deleteMany({ family: undefined })` serialises to `{ family: null }` and would
match **every legacy row for every user**. That is the same footgun analysed
under F1.

### Verification

`npx tsc --noEmit` clean; `npx next build` compiles. The state machine was
extracted into a pure `classifyRefreshRow()` so the **real** function could be
tested rather than a re-implementation:

| Case | Decision |
| --- | --- |
| Live row, cap ahead | `rotate` |
| **Cap passed, `expires` still ahead** | **`expired`** — the two-clock guarantee |
| Cap ahead, `expires` passed | `rotate` — the cap is authoritative |
| Consumed 1s ago | `grace` |
| Consumed exactly at the boundary | `grace` |
| Consumed 1ms past the boundary | `reuse` |
| Consumed 1 hour ago | `reuse` |
| Legacy row, no cap, `expires` ahead | `rotate` |
| Legacy row, `expires` passed | `expired` via fallback |
| Legacy cap value | falls back to `expires` |

`revokeFamily()` was separately confirmed to short-circuit on `undefined`,
`null`, `""`, `0` and `{}` without issuing a query.

**Not exercised against a live database.** The classifier is genuinely tested,
but the surrounding I/O is not: that the compare-and-set actually serialises two
concurrent writers, that the new row is created with the right family, and that
`deleteMany({ family })` removes the expected lineage are all reasoned from the
code. **This is the change most in need of a real smoke test** — specifically
two tabs refreshing at once, which must not log the user out.

### Blast radius

Every refresh now performs **writes** (one update, one insert) where it
previously performed two reads, and re-issues the cookie each time. No client
change was needed — the browser applies `Set-Cookie` on the same-origin refresh
call automatically.

Row count per active session stays at one live row plus its retired
predecessors, which the TTL index sweeps when the family's cap passes.

A consequence worth stating plainly: **a refresh token is now single-use.** Any
client that replayed one — a stale service worker, a restored tab, a copied
cookie — will now trip the grace window and, past 60 seconds, be treated as
theft.
