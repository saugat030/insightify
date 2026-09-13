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
