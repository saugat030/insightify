# Deployment & Rate Limiting

> How Insightify is rate limited and how it is meant to run in production:
> Cloudflare in front, nginx terminating TLS on a DigitalOcean droplet, the app
> and Redis in Docker Compose, Mongo in Atlas.

**Status of each part — read this first:**

| Layer | State |
| --- | --- |
| App-level rate limiting (`lib/rateLimit.ts` and callers) | ✅ **Built and verified** — against real Redis and through the running app |
| `RateLimiterRedis` path | ✅ **Verified** — real keys, TTLs, fail-open and fail-loud all exercised |
| `Dockerfile` + `docker-compose.yml` | ✅ **Written and run locally** — image builds, stack comes up, Redis unreachable from the host |
| nginx config | ✅ **Written and verified locally** — `deploy/nginx/`; spoofing rejection proven |
| ufw, Cloudflare, droplet | 📋 **Designed, not done** — [§6](#6-firewall) onward |

- **Related:** [`AUTHENTICATION.md`](./AUTHENTICATION.md) (finding **F6**),
  [`AUTH-FIX.md`](./AUTH-FIX.md)

---

## Table of contents

1. [Topology](#1-topology)
2. [Why the limiter lives in route handlers](#2-why-the-limiter-lives-in-route-handlers)
3. [The app layer](#3-the-app-layer)
4. [Redis in Compose](#4-redis-in-compose)
5. [nginx](#5-nginx)
6. [Firewall](#6-firewall)
7. [Cloudflare](#7-cloudflare)
8. [Environment](#8-environment)
9. [Order of work](#9-order-of-work)
10. [Known risks](#10-known-risks)
11. [**Runbook: fresh droplet to live**](#11-runbook-fresh-droplet-to-live)

---

## 1. Topology

```
        client
          |  HTTPS
   +------v-----------+
   |   Cloudflare     |  proxied (orange cloud), Full (Strict)
   |   sets CF-Connecting-IP, strips client-supplied copies
   +------+-----------+
          |  HTTPS :443 - droplet firewall admits Cloudflare ranges only
   +------v-----------+
   |  nginx (host)    |  TLS via Cloudflare Origin Certificate
   |  real_ip_header  |  resolves the true client IP
   |  limit_req       |  coarse zones, well above the app limits
   +------+-----------+
          |  proxy_pass http://127.0.0.1:3000
   +------v-----------+        +--------------+
   |  web (compose)   |------->|    redis     |  no published ports
   |  Next.js         |  TCP   |  rl: + cache:|  compose network only
   +------+-----------+        +--------------+
          |
    Mongo Atlas (IP-allowlisted)
```

Two independent limiters, deliberately. The nginx `limit_req` zones are a
**coarse backstop** against floods that should never reach Node; the app's
limiter is the **precise** one that understands accounts, endpoints and
successful logins. The nginx zones sit well above the app's, so the app is
always what rejects a normal abuser — nginx fires only when something is badly
wrong.

---

## 2. Why the limiter lives in route handlers

Two constraints rule out the usual answers:

- **Not `express-rate-limit` / `rate-limit-redis`.** Those are Express
  middleware expecting `(req, res, next)`. App Router handlers receive a Web
  `Request` and return a `Response`. There is no `next()` and no Express `res`.
- **Not `proxy.ts`** (this repo's Next 16 name for middleware). It runs on the
  Edge runtime, which has no TCP sockets, so `ioredis` cannot connect there.

So limiting happens at the top of each route handler, on the Node runtime.

### Why not `@upstash/ratelimit`

It is built for Upstash's **REST** client and cannot drive `ioredis`. Verified
against the packages themselves:

```
@upstash/ratelimit expects:  Pick<Redis, "evalsha" | "get" | "set">  from @upstash/redis

upstash  evalsha(sha1, keys: string[], args: TArgs)   <- array-based
ioredis  evalsha(sha1, numkeys: number, ...args)      <- variadic
```

Incompatible call conventions: it fails type-checking, and casting past that
fails at runtime. **`rate-limiter-flexible` is used instead** — same sliding
window and block-duration semantics, built for ioredis.

This rules out the *library*, not Upstash the *provider*: their hosted Redis
also speaks native TCP, so it works fine as a `REDIS_URL`.

---

## 3. The app layer

### 3.1 Files

| File | Role |
| --- | --- |
| [`lib/redis.ts`](../lib/redis.ts) | ioredis singleton. Resolved lazily, so `next build` does not need Redis. |
| [`lib/rateLimit.ts`](../lib/rateLimit.ts) | The limits table, `consume`, `rateLimit`, `resetLimit`. |
| [`lib/clientIp.ts`](../lib/clientIp.ts) | Extracts the client IP from proxy headers. |

### 3.2 The limits

`points` per `duration` seconds; exceeding it locks the key out for
`blockDuration` seconds.

| Bucket | Key | Points | Window | Block | Used by |
| --- | --- | --- | --- | --- | --- |
| `loginIp` | `rl:login:ip` | 30 | 15 min | 15 min | `POST /api/auth/login` |
| `loginAccount` | `rl:login:acct` | 10 | 15 min | 15 min | `POST /api/auth/login` |
| `register` | `rl:register:ip` | 10 | 1 h | 1 h | `POST /api/auth/register` |
| `forgotIp` | `rl:forgot:ip` | 10 | 1 h | 1 h | `POST /api/auth/forgot-password` |
| `forgotAccount` | `rl:forgot:acct` | 5 | 1 h | 1 h | `POST /api/auth/forgot-password` |
| `otpVerifyIp` | `rl:otp:verify:ip` | 50 | 15 min | 15 min | `verify-otp`, `reset-password` |
| `otpResendIp` | `rl:otp:resend:ip` | 10 | 1 h | 1 h | `POST /api/auth/resend-otp` |
| `refresh` | `rl:refresh:ip` | 200 | 15 min | 5 min | `POST /api/auth/refresh` |
| `google` | `rl:google:ip` | 30 | 15 min | 15 min | `POST /api/auth/google` |

**Per-IP values are deliberately loose.** Cloudflare passes *real* client
addresses, so one office or mobile-carrier NAT can be dozens of genuine users
sharing a bucket. Stopping automation only needs the right order of magnitude —
credential stuffing runs thousands of attempts, not thirty. A tight per-IP limit
(5 per 15 min was considered) would lock out a small team arriving at 9am.

`refresh` is the loosest because it fires on every page load and already
requires a valid cookie.

### 3.3 Per-IP *and* per-account

F6 asked for both, and they catch different attacks:

- **Per-IP** — one source trying many accounts (credential stuffing).
- **Per-account** — many sources trying one account (a targeted, distributed
  attack). Without this, rotating IPs defeats the limiter entirely.

`login` and `forgot-password` carry both. A successful login calls
`resetLimit(loginAccount)`, so someone who mistyped a few times is not left
penalised.

> **Accepted trade-off:** because the per-account bucket is keyed on the email
> alone, 10 failed logins lock that account for 15 minutes **regardless of
> source** — so an attacker can deliberately lock out an account whose address
> they know. This is the classic per-account-lockout DoS. It is accepted because
> the alternative, dropping per-account limits, leaves distributed attacks
> unbounded, which is worse.

### 3.4 Determining the client IP

Order of preference in `clientIp()`: `x-real-ip` → `cf-connecting-ip` →
left-most `x-forwarded-for` → `"unknown"`.

> **These headers are forgeable by whoever connects.** They are meaningful only
> because nginx *overwrites* them and the app is unreachable directly. If the
> app is ever exposed, anyone can send a different `X-Real-IP` per request and
> every per-IP limit becomes decorative.
>
> This is why [§5](#5-nginx) uses `set_real_ip_from` rather than blindly
> forwarding `$http_cf_connecting_ip` — nginx must **validate that the
> connection came from Cloudflare** before trusting the header. The firewall
> alone is not enough: it makes one config file the only thing standing between
> you and unlimited requests.

### 3.5 Failure policy

| Situation | Behaviour | Why |
| --- | --- | --- |
| Redis unreachable | **Allow the request**, log `[RATE_LIMIT_UNAVAILABLE]` | A limiter outage must not take authentication down. Redis is a container away, so "unreachable" usually means the host is already gone. |
| `REDIS_URL` unset in production | **Throw** — the endpoint 500s | A deployment fault, not an outage. Failing open here would silently disable every limit. `consume()` re-raises `RedisMisconfiguredError` rather than swallowing it. |
| `REDIS_URL` unset in development | In-memory limiter | Contributors should not need Redis to run the app. Per-process, so it is not a real limit — never reached in production by construction. |

Fail-closed on login was considered and **rejected**: it makes Redis a hard
dependency for authentication on a single node with no replica, so a Redis blip
locks everyone out.

### 3.6 What has actually been verified

Exercised directly against `lib/rateLimit.ts`:

| Check | Result |
| --- | --- |
| Per-IP login limit | first rejection at attempt **31** of 30 |
| A different IP | unaffected |
| 429 shape | `status 429`, `Retry-After: 900`, `retryAfterSeconds` in the body |
| Distributed attack — 12 IPs, one account | stopped at attempt **11** by `loginAccount` |
| Account key normalisation | `victim@example.com` and `  VICTIM@Example.COM  ` share one bucket |
| `resetLimit` on a blocked bucket | clears it |
| `clientIp` precedence | `x-real-ip` > `cf-connecting-ip` > left-most `x-forwarded-for` > `unknown` |

### Redis-backed results

Re-run against `redis:7-alpine` in Docker, and then through the containerised
app in production mode:

| Check | Result |
| --- | --- |
| Per-IP limit against real Redis | first rejection at attempt **31** of 30 |
| Keys written | `rl:login:ip:203.0.113.9`, `rl:otp:resend:ip:...` - all under `rl:` |
| TTL after the bucket is exhausted | **900s** - `blockDuration`, not just the window |
| Per-account across 12 source IPs | stopped at attempt **11** |
| `resetLimit` | key deleted from the keyspace |
| Redis **stopped** mid-flight | request **ALLOWED** (fail open), logged `[RATE_LIMIT_UNAVAILABLE]`, cost **212ms** |
| `REDIS_URL` blank, `NODE_ENV=production` | **HTTP 500** + `RedisMisconfiguredError` - never a silent 200 |
| Live server, 12 logins from 12 IPs at one account | 401 x10 then **429** |

The last two are the pair that matters: an *outage* fails open so authentication
survives, while *misconfiguration* fails loudly so limits are never silently
absent.

#### One config change this testing forced

`lib/redis.ts` originally used `enableOfflineQueue: false`, so any command
issued before the socket was ready failed outright - meaning the first requests
after a cold start would fail open. It now bounds commands instead:

```ts
commandTimeout: 500,      // a dead Redis costs ~0.5s, not a hung request
maxRetriesPerRequest: 1,
```

Commands queue through the initial connect, but a genuinely dead Redis rejects
quickly. Measured cost of a check against stopped Redis: 212ms.

---

## 4. Redis in Compose

One container, no published ports, serving both `rl:` (limits) and `cache:`
(later).

**Written and verified locally.** `docker-compose.yml` and a multi-stage
`Dockerfile` are at the repo root. `docker compose up -d` brings both services
up; `docker compose ps` shows redis as `6379/tcp` with **no host binding**, and
a TCP probe from the host is refused. The runtime image is **329MB** on
`node:22-alpine` using `output: "standalone"`.

```yaml
# docker-compose.yml at the repo root - see the build-context note below
services:
  web:
    build: .
    environment:
      REDIS_URL: redis://default:${REDIS_PASSWORD}@redis:6379
    ports: ["127.0.0.1:3000:3000"]   # loopback only; nginx runs on the host
    depends_on: [redis]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy volatile-lru
    restart: unless-stopped
```

- **No `ports:` on redis.** Publishing a container port writes iptables rules
  that bypass ufw, so a "firewalled" 6379 would still be open to the internet.
- **`127.0.0.1:3000:3000` on web**, not `3000:3000`, for the same reason — nginx
  is on the host, so loopback is all it needs.
- **If the compose file lives in `deploy/`**, `build: .` resolves the context to
  `deploy/`, which has no `package.json`. Use
  `build: { context: .., dockerfile: ../Dockerfile }`, or keep the file at the
  repo root.
- **Set `output: "standalone"`** in `next.config.ts` for a much smaller image;
  the current `Dockerfile` is single-stage and ships devDependencies and source.
- **Persistence is not needed.** Rate-limit and cache data are both ephemeral;
  losing them on restart merely resets the windows. AOF only costs disk I/O
  here.

### Build-time environment: a trap worth knowing

`next build` imports every route to collect page data, so **any module-level
`throw` on a missing env var runs during the build**, not just at boot. Two
modules do this today:

| Module | Asserts at import |
| --- | --- |
| `lib/auth.ts` | `JWT_SECRET`, `JWT_REFRESH_SECRET` |
| `lib/gemini.ts` | `GOOGLE_GEMINI_API_KEY` |

The `Dockerfile` therefore sets throwaway placeholders in the **build stage**
only; real values arrive from the environment at runtime. Both were discovered
by the build failing - `gemini` broke it even though nothing about the Gemini
key matters to a container image.

`lib/db.ts`, `lib/mail.ts` and `lib/redis.ts` check lazily inside functions
instead, so they do not need placeholders. **A new module-level assertion means
adding another `ENV` line to the Dockerfile**, or better, making the check lazy.

### `NEXT_PUBLIC_*` is a build input, not a runtime one

`/login` and `/register` are **statically prerendered** (`○` in the build
output), so `app/layout.tsx` reads `NEXT_PUBLIC_GOOGLE_CLIENT_ID` *during the
build* and the value is frozen into the HTML. Supplying it at runtime through
`env_file` arrives too late - the page already exists.

Measured, building with and without it:

| Build | Runtime env | Client id in served `/login` |
| --- | --- | --- |
| with the var | - | 1 occurrence |
| without it | var supplied | **0** - Google sign-in silently broken |
| build arg only | var **absent** | 1 occurrence |

`.dockerignore` excludes `.env`, so the Docker build cannot see it. It is passed
as a build argument instead:

```dockerfile
ARG BUILD_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$BUILD_GOOGLE_CLIENT_ID
```

```yaml
build:
  context: .
  args:
    BUILD_GOOGLE_CLIENT_ID: ${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
```

The three names are deliberately different so each hop is visible:
`${NEXT_PUBLIC_GOOGLE_CLIENT_ID}` is what compose looks up on the host (shell
first, then `.env`); `BUILD_GOOGLE_CLIENT_ID` is the build-argument channel; and
the `ENV` name is what Next reads, so only that one is fixed. Matching all three
is the more common convention and works identically.

If the argument is not passed, the build does **not** fail - `ENV X=$ARG`
becomes an empty string and Google sign-in breaks silently.

No secret is exposed - `NEXT_PUBLIC_` means the browser gets it anyway. The real
consequence is that **the image is environment-specific**: changing the client id
needs a rebuild, not a restart. Any future `NEXT_PUBLIC_*` variable needs the
same two lines.

### Dev and prod run different Redis instances

They are never both in play, and they are configured from different files.

| | Development | Production |
| --- | --- | --- |
| Started by | `docker compose -f docker-compose.dev.yml up -d` | `docker compose up -d` |
| Container | `dev-redis` | the `redis` service |
| Client | `npm run dev`, on the **host** | the `web` **container** |
| Published port | `127.0.0.1:6379` - the host client has no other route in | **none** - only the compose network |
| Password | none; nothing off-machine can reach it | `REDIS_PASSWORD` |
| Configured by | `.env.local` -> `REDIS_URL=redis://localhost:6379` | `.env` -> `REDIS_PASSWORD` |

That is why `.env.local` holds a *URL* and `.env` holds a *password*: the dev
instance has no password, so its URL is plain, while compose **builds** the
production URL rather than storing it.

#### Where REDIS_PASSWORD actually goes

Compose reads `.env` from the project directory and substitutes `${...}` into
the compose file before parsing it. One value lands in three places:

```yaml
redis:
  command:     redis-server --requirepass ${REDIS_PASSWORD}        # the server
  healthcheck: ["CMD","redis-cli","-a","${REDIS_PASSWORD}","ping"] # the probe
web:
  environment:
    REDIS_URL: redis://default:${REDIS_PASSWORD}@redis:6379        # the client
```

Change it in `.env` and all three move together. **Do not add `REDIS_URL` to
`.env`** - it would duplicate the password, and the two copies could drift.

Two distinct compose mechanisms both happen to read `.env`:

- **`${...}` substitution** - automatic, always `.env` in the project directory.
- **`env_file: [.env]`** - injects every variable into the container, which is
  how `MONGODB_URI`, `JWT_SECRET` and `RESEND_API_KEY` reach the app.

`environment:` wins over `env_file:`, so the constructed `REDIS_URL` is always
the one the app sees.

#### `redis` is a hostname, not a host

`@redis:6379` resolves through Docker's embedded DNS to the container on the
compose network. There is no published port because there is nothing on the
host that needs it - the only client is the `web` container. Debugging still
works without one:

```bash
PW=$(grep '^REDIS_PASSWORD=' .env | cut -d= -f2-)
docker compose exec redis redis-cli -a "$PW" --no-auth-warning --scan --pattern 'rl:*'
```

#### The failure symptom to recognise

If Redis is missing while `REDIS_URL` is still set, the app does **not** fall
back to the in-memory limiter. It tries the configured server, fails, and
[fails open](#35-failure-policy) on every check - logging
`[RATE_LIMIT_UNAVAILABLE]` while applying no limits at all. Everything appears
to work; the limiter simply is not there. Seeing that line in dev almost always
means the Redis container is not running.

### The `volatile-lru` caveat

`volatile-lru` evicts only keys that carry a TTL, so **every cache write must
set an expiry** or Redis returns OOM instead of evicting.

Less obvious, and worth deciding deliberately: rate-limit keys *also* carry
TTLs, so under memory pressure Redis may evict them too — cache growth can
silently weaken the limits. Either size `maxmemory` generously for the whole
keyspace, or split limits and cache into two instances.

---

## 5. nginx

**Written and verified locally.** Files live in `deploy/nginx/`:

| File | Role |
| --- | --- |
| `app.conf` | The site config: TLS, real-IP resolution, `limit_req` zones, proxy headers. |
| `cloudflare-ips.conf` | **Generated.** `set_real_ip_from` for every Cloudflare range, then `real_ip_header CF-Connecting-IP`. |
| `refresh-cloudflare-ips.sh` | Regenerates the above. Cloudflare's ranges change; a stale list means legitimate edge nodes stop being trusted and everyone behind them collapses into one bucket. |

Install by symlink, so the repo stays the source of truth:

```bash
sudo ln -sf /opt/insightify/deploy/nginx/app.conf          /etc/nginx/sites-enabled/app.conf
sudo ln -sf /opt/insightify/deploy/nginx/cloudflare-ips.conf /etc/nginx/cloudflare-ips.conf
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit in the repo, never through the symlink.

### Trusting the client IP correctly

This is the highest-risk line in the whole deployment. `app.conf` includes:

```nginx
include /etc/nginx/cloudflare-ips.conf;   # set_real_ip_from ... + real_ip_header
```

nginx then honours `CF-Connecting-IP` **only when the connection itself
originates from a Cloudflare range**, and rewrites `$remote_addr` to the real
client. `X-Real-IP $remote_addr` is what the app reads.

The tempting alternative, `proxy_set_header CF-Connecting-IP
$http_cf_connecting_ip;`, forwards whatever the client sent. With that, anyone
reaching the origin gets a fresh rate-limit bucket per request simply by varying
a header, and the firewall is the only thing preventing it.

**Proven, not assumed.** A local harness ran the real `app.conf` (two lines
changed: upstream target and trusted range) behind nginx with the app and Redis,
using static container IPs so one source could play Cloudflare and another an
outsider. The bucket the app actually wrote to was read back out of Redis:

| Source | Sends | Bucket the app used |
| --- | --- | --- |
| **Trusted** 172.30.0.10 | `CF-Connecting-IP: 203.0.113.55` | `rl:otp:resend:ip:203.0.113.55` — header honoured |
| **Untrusted** 172.30.0.66 | `CF-Connecting-IP: 9.9.9.9` | `rl:otp:resend:ip:172.30.0.66` — **spoof ignored** |

And the attack it stops: the untrusted source sent 12 requests, each with a
different spoofed `CF-Connecting-IP`. All 12 landed in **one** bucket (its real
address) and it was refused at request 11.

### Coarse zones

```nginx
limit_req_zone $binary_remote_addr zone=general:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=auth:10m    rate=5r/s;
```

`$binary_remote_addr` is the *real* client, because real-IP resolution has
already run. `/api/auth/` uses the `auth` zone, everything else `general`, both
with `nodelay` so a legitimate burst is served rather than queued.

Verified: 120 concurrent requests to `/` produced **55 accepted, 65 rejected** —
and `/` has no app-level limit, so those rejections can only have come from
nginx. 55 matches `burst=50` plus the sustained rate.

### Other settings worth knowing

- `proxy_read_timeout 100s` — matched to Cloudflare's free-plan ceiling, since
  waiting longer cannot help (see [§10](#10-known-risks)).
- `client_max_body_size 25m` — below Cloudflare's 100MB cap.
- `http2 on`, TLS 1.2/1.3 only, and the usual `nosniff` / `SAMEORIGIN` /
  `Referrer-Policy` headers.
- The `:80` block only redirects; ufw does not open 80, since Cloudflare reaches
  the origin on 443 under Full (Strict).

### Deploy loop

```bash
git pull && sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` before every reload, without exception. The config in this repo
passes it.

## 6. Firewall

```bash
sudo ufw default deny incoming
sudo ufw allow 22
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
  sudo ufw allow from $ip to any port 443 proto tcp
done
# repeat for https://www.cloudflare.com/ips-v6
sudo ufw enable
```

Port 80 is not needed: Cloudflare connects to the origin on 443 under Full
(Strict).

**Verify from somewhere else** that the origin is closed:

```bash
nc -zv DROPLET_IP 6379        # must fail
nc -zv DROPLET_IP 3000        # must fail
curl -sk https://DROPLET_IP/  # must fail or hang, not serve the app
```

That last one matters most: if the origin answers direct connections, the
`X-Real-IP` trust described in [§3.4](#34-determining-the-client-ip) is
defeated.

---

## 7. Cloudflare

- Web DNS records **proxied** (orange cloud). **MX and mail records stay grey** —
  proxying them breaks mail, which this app now depends on for OTP and password
  reset.
- **SSL/TLS mode: Full (Strict).** Flexible causes a redirect loop.
- Generate an **Origin Certificate** and install it on the droplet. No certbot,
  no renewal cron.
- One Cloudflare-level rate limiting rule on `/api/auth/login`, roughly 5 per
  10s per IP — much tighter than the app's, because it is a flood guard rather
  than the policy.
- Leave **Under Attack Mode off**; it interstitials API clients.

> **Verify `CF-Connecting-IP` reaches the limiter before turning the proxy on.**
> If it does not, every visitor arrives as a Cloudflare edge address and the
> whole planet shares one bucket — a self-inflicted outage within minutes. Log
> the resolved IP on one request and read it back before flipping the cloud
> orange.

---

## 8. Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `REDIS_URL` | prod: **yes** | `redis://default:PASSWORD@redis:6379` in compose. `rediss://` for a hosted TLS endpoint — ioredis enables TLS from the scheme, so test↔prod is a one-line change. Unset in dev falls back to an in-memory limiter. |
| `REDIS_PASSWORD` | prod | Consumed by compose both to build `REDIS_URL` and to set `--requirepass`. |
| `MONGODB_URI` | yes | Atlas. **The droplet's IP must be on the Atlas allowlist.** |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | yes | `lib/auth.ts` throws at import without them. |
| `RESEND_API_KEY` | yes | OTP and password-reset mail. |
| `MAIL_FROM` | no | Defaults to `Insightify <insightify@saugat030.com.np>`. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | for Google | |
| `GOOGLE_CLIENT_SECRET` | for Google | **Still unset** — the Google sign-in path has never executed. See F3. |

`.env` and `deploy/certs/` must both be git-ignored.

---

## 9. Order of work

1. ✅ **DONE - Redis reachable locally** (Docker, or a hosted `rediss://`). Re-run the
   checks in [§3.6](#36-what-has-actually-been-verified) against
   `RateLimiterRedis` and confirm keys appear under `rl:` with sane TTLs.
2. ✅ **DONE - Dockerfile multi-stage + `output: "standalone"`**, then compose up
   locally and confirm the app reaches Redis over the network with no published
   Redis port.
3. **Droplet.** Deploy, add its IP to the Atlas allowlist, confirm 6379 and 3000
   are unreachable from outside.
4. 🟡 **WRITTEN - nginx** with the real-IP config; TLS still needs the real
   Origin Certificate at `/etc/nginx/certs/`. `nginx -t`, then reload.
5. **Confirm the resolved client IP** is a real visitor address, not a
   Cloudflare edge — *before* the next step.
6. **Cloudflare proxy on**, Full (Strict), plus the login rule.
7. **nginx `limit_req` zones** last, once the real traffic shape is known.
8. **Caching later**, under `cache:`, every key with a TTL.

---

## 10. Known risks

| Risk | Note |
| --- | --- |
| **`POST /api/links` may exceed Cloudflare's 100s cap** | It runs `scrapeUrl()` then `getAiAnalysis()` **serially**. A slow page plus a slow Gemini call can pass 100s, and the user sees a 524 even if the work completes. Needs a scrape timeout or a background job. |
| Publishing Redis's port | Silently bypasses ufw via Docker's iptables rules. |
| Proxying without `CF-Connecting-IP` handling | Every user shares one bucket. Instant outage. |
| Cache write without a TTL under `volatile-lru` | OOM instead of eviction. |
| Cache growth evicting `rl:` keys | Limits weaken silently. See [§4](#4-redis-in-compose). |
| Cloudflare free plan caps uploads at 100MB | Relevant if media upload grows. |
| Reloading nginx without `nginx -t` | A typo takes the site down. |
| Atlas allowlist | The droplet's IP must be added, and it is not static unless reserved. |

---

## 11. Runbook: fresh droplet to live

Written for a **brand-new Ubuntu droplet**. Run top to bottom. The ordering is
deliberate in three places and those are called out.

### Before you SSH

Have these ready, or steps stall halfway:

- Domain already in Cloudflare (nameservers pointed, DNS resolving).
- A **Cloudflare Origin Certificate** generated (Dashboard → SSL/TLS → Origin
  Server → Create Certificate). Keep the cert **and** the private key open — the
  key is shown **once**.
- Your Mongo Atlas login, to allowlist the droplet's IP.
- Repo access from the droplet: a **deploy key** if the repo is private.
- The values for `.env` (see [§8](#8-environment)).

### 11.1 First login and a non-root user

```bash
ssh root@DROPLET_IP

apt update && apt upgrade -y
adduser deploy                 # set a password
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/
```

> **Hazard 1 — do not skip.** Open a **second terminal** and confirm
> `ssh deploy@DROPLET_IP` works *before* touching SSH config. If it fails,
> you still have the first session to fix it.

Once that works, harden SSH:

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 11.2 Cloud Firewall: the layer Docker cannot bypass

Done in the **DigitalOcean control panel**, not on the droplet — Networking →
Firewalls → Create Firewall, then assign it to the droplet.

| Direction | Rule |
| --- | --- |
| Inbound | SSH, TCP **22** |
| Inbound | HTTPS, TCP **443** |
| Outbound | **leave as allow-all** |

Nothing else. No 80, no 3000, no 6379.

**Why this is not just a second copy of ufw.** It is enforced at
DigitalOcean's network layer, *outside* the droplet:

- **Docker cannot bypass it.** Publishing a container port writes iptables
  rules inside the droplet that take precedence over ufw — so a compose file
  changed to `3000:3000` is reachable from the internet while `ufw status`
  still cheerfully reports 3000 as blocked. The cloud firewall sits in front of
  all of that and blocks it anyway. This is the single reason the layer earns
  its place.
- **Root on the droplet cannot switch it off.** ufw is just software on the
  box. Disabling this one needs DigitalOcean credentials.
- **It is active before the droplet finishes booting**, covering the window
  before ufw loads.

**Keep it coarse.** Do *not* enter the Cloudflare ranges here. That list already
lives in ufw ([§11.9](#119-open-443-to-cloudflare-only)) and in
`deploy/nginx/cloudflare-ips.conf`; a third copy means three places to update
when Cloudflare adds a range, and a stale copy silently blocks legitimate edge
nodes. The division of labour:

| Layer | Job |
| --- | --- |
| Cloud Firewall | Which **ports** exist at all. Catches anything Docker publishes by accident. |
| ufw | Which **sources** may reach 443. |

> **Leave outbound alone.** The droplet needs to reach Mongo Atlas, Resend,
> Google, Docker Hub and apt. Restricting outbound is where people break things
> without realising what they broke.

> **You cannot lock yourself out.** DigitalOcean's **Recovery Console** is
> out-of-band and works regardless of firewall rules, so restricting SSH to your
> home IP is safer here than the equivalent on a bare server. Worst case, use
> the console or edit the rule in the control panel.

### 11.3 Firewall before anything listens

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw enable            # confirms; say yes
sudo ufw status verbose
```

> **Hazard 2.** `ufw allow OpenSSH` must come before `enable`, or you lock
> yourself out of a machine you cannot console into easily.

443 stays closed for now — it opens to Cloudflare only, in [§11.9](#119-open-443-to-cloudflare-only).

### 11.4 Swap, if the droplet is small

`next build` is memory-hungry. On a 1GB droplet it will be OOM-killed, usually
appearing as a build that dies with no useful error.

```bash
free -h                     # if total RAM < 2G, add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Alternative, if you would rather not build on the droplet at all: build the
image elsewhere, push to a registry, and have compose `image:` it instead of
`build:`.

### 11.5 Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
newgrp docker                # or log out and back in
docker run --rm hello-world  # sanity check
```

> **Hazard 3.** Docker writes its own iptables rules that **bypass ufw for
> published ports**. This is why `docker-compose.yml` publishes web as
> `127.0.0.1:3000:3000` and gives redis no `ports:` at all. If you ever change
> a mapping to `3000:3000`, you have opened it to the internet regardless of
> what `ufw status` claims.

### 11.6 The code

```bash
sudo mkdir -p /opt/insightify
sudo chown deploy:deploy /opt/insightify
git clone git@github.com:YOU/insightify.git /opt/insightify
cd /opt/insightify
```

For a private repo, add a deploy key first:

```bash
ssh-keygen -t ed25519 -C "insightify-droplet" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub     # add to GitHub -> repo -> Deploy keys (read-only)
```

### 11.7 Environment file

```bash
cd /opt/insightify
openssl rand -base64 32       # use for REDIS_PASSWORD

nano .env                     # see the table in section 8
chmod 600 .env
```

`.env` is git-ignored. It must contain at least `MONGODB_URI`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `RESEND_API_KEY`, `GOOGLE_GEMINI_API_KEY` and
`REDIS_PASSWORD`. Compose builds `REDIS_URL` from `REDIS_PASSWORD`; do not set
`REDIS_URL` yourself.

### 11.8 Atlas allowlist

```bash
curl -s https://ifconfig.me    # the droplet's public IP
```

Add it in Atlas → Network Access. Without this every request 500s on a Mongo
timeout, which looks exactly like an app bug.

If you want a stable entry, reserve the droplet's IP in DigitalOcean first —
otherwise a rebuild changes it and Atlas silently starts refusing.

### 11.9 Open 443 to Cloudflare only

```bash
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
  sudo ufw allow from $ip to any port 443 proto tcp
done
for ip in $(curl -s https://www.cloudflare.com/ips-v6); do
  sudo ufw allow from $ip to any port 443 proto tcp
done
sudo ufw status numbered
```

Port 80 stays shut: Cloudflare reaches the origin on 443 under Full (Strict).

### 11.10 nginx and the Origin Certificate

```bash
sudo apt install -y nginx
sudo mkdir -p /etc/nginx/certs

sudo nano /etc/nginx/certs/origin.pem   # paste the certificate
sudo nano /etc/nginx/certs/origin.key   # paste the private key
sudo chmod 600 /etc/nginx/certs/origin.key
```

Point `server_name` in `deploy/nginx/app.conf` at your domain if it is not
already, then link the config in:

```bash
sudo ln -sf /opt/insightify/deploy/nginx/app.conf /etc/nginx/sites-enabled/app.conf
sudo ln -sf /opt/insightify/deploy/nginx/cloudflare-ips.conf /etc/nginx/cloudflare-ips.conf
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t                 # must pass before reloading
sudo systemctl reload nginx
```

### 11.11 Build and start

```bash
cd /opt/insightify
docker compose build          # several minutes; this is what needs the swap
docker compose up -d
docker compose ps
```

Expect redis as `6379/tcp` with **no** host binding, and web as
`127.0.0.1:3000->3000/tcp`. Then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:3000/api/auth/refresh
# 401 = app is up and talking to Mongo.  500 = check `docker compose logs web`.
```

### 11.12 Confirm the origin is sealed

Run these **from your laptop**, not the droplet:

```bash
nc -zv DROPLET_IP 6379        # must fail
nc -zv DROPLET_IP 3000        # must fail
curl -sk --max-time 5 https://DROPLET_IP/   # must fail or hang
```

That last one matters most. If the origin answers direct connections, the
`X-Real-IP` trust in [§3.4](#34-determining-the-client-ip) is defeated and every
per-IP limit can be bypassed by varying a header.

### 11.13 Cloudflare

- DNS: web records **proxied** (orange cloud). **MX and mail records stay
  grey** — proxying them breaks mail, and this app depends on mail for OTP and
  password reset.
- SSL/TLS → **Full (Strict)**. Flexible causes a redirect loop.
- Security → Rate limiting: one rule on `/api/auth/login`, ~5 per 10s per IP.
- Leave **Under Attack Mode off**; it interstitials API clients.

### 11.14 Verify the real client IP reaches the limiter

**Do this immediately after enabling the proxy, before announcing anything.**
If `CF-Connecting-IP` is not being resolved, every visitor arrives as a
Cloudflare edge address and the whole internet shares one bucket.

From your laptop, make one request, then on the droplet:

```bash
curl -s https://your-domain/api/auth/refresh -X POST -o /dev/null

PW=$(grep '^REDIS_PASSWORD=' /opt/insightify/.env | cut -d= -f2-)
docker compose -f /opt/insightify/docker-compose.yml exec -T redis \
  redis-cli -a "$PW" --no-auth-warning --scan --pattern 'rl:refresh:*'
```

You want `rl:refresh:ip:<your home IP>`. A Cloudflare edge address (e.g.
`172.7x.x.x`) means real-IP resolution is not working — turn the proxy back off
and recheck [§5](#5-nginx) before any traffic arrives.

### 11.15 Smoke test the real flows

Through the live domain:

1. Register → the OTP email arrives → verify → lands on the dashboard.
2. Log out, log back in.
3. Forgot password → code arrives → reset → old password rejected.
4. Settings → sessions list shows the device → revoke works.
5. Exceed a limit deliberately (11 password-reset requests) → `429` with
   `Retry-After`.

**Google sign-in has still never executed.** Set `GOOGLE_CLIENT_SECRET` in
`.env`, restart, then test both branches deliberately: a brand-new Google
account (creates, `emailVerified: true`) and a Google sign-in against an
existing unverified password account (must return `409
PASSWORD_ACCOUNT_EXISTS`). See F3 in [`AUTHENTICATION.md`](./AUTHENTICATION.md).

### 11.16 Routine deploys

```bash
cd /opt/insightify
git pull
docker compose build web
docker compose up -d web       # redis keeps running
sudo nginx -t && sudo systemctl reload nginx   # only if nginx config changed
```

Useful afterwards:

```bash
docker compose logs -f web           # app logs
docker compose ps                    # health
sudo ufw status verbose              # firewall still as expected
```

Worth setting up once, when convenient: Docker log rotation, so logs do not
fill the disk.

```bash
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' \
  | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```
