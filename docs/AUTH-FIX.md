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
