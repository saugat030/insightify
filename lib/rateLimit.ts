import { NextResponse } from "next/server";
import {
  RateLimiterRedis,
  RateLimiterMemory,
  RateLimiterAbstract,
  RateLimiterRes,
} from "rate-limiter-flexible";
import { getRedis, RedisMisconfiguredError } from "@/lib/redis";
import { clientIp } from "@/lib/clientIp";

// Shared Redis keyspace: rl: for limits, cache: for everything else
const KEY_PREFIX = "rl";

export interface LimitRule {
  /** Distinguishes one bucket from another, e.g. "login:ip". */
  key: string;
  /** Requests allowed per window. */
  points: number;
  /** Window length, seconds. */
  duration: number;
  /** How long to lock out after the window is exhausted, seconds. */
  blockDuration: number;
}

// Per-IP catches credential stuffing from one source; per-account catches an
// attacker spreading the same target across many IPs. F6 asked for both.
// Per-IP values are deliberately loose: Cloudflare passes real client
// addresses, so one office or mobile carrier NAT can be dozens of genuine
// users. Stopping automation only needs the right order of magnitude —
// credential stuffing runs thousands of attempts, not thirty.
export const LIMITS = {
  loginIp:        { key: "login:ip",        points: 30,  duration: 900,  blockDuration: 900  },
  loginAccount:   { key: "login:acct",      points: 10,  duration: 900,  blockDuration: 900  },
  register:       { key: "register:ip",     points: 10,  duration: 3600, blockDuration: 3600 },
  forgotIp:       { key: "forgot:ip",       points: 10,  duration: 3600, blockDuration: 3600 },
  forgotAccount:  { key: "forgot:acct",     points: 5,   duration: 3600, blockDuration: 3600 },
  otpVerifyIp:    { key: "otp:verify:ip",   points: 50,  duration: 900,  blockDuration: 900  },
  otpResendIp:    { key: "otp:resend:ip",   points: 10,  duration: 3600, blockDuration: 3600 },
  refresh:        { key: "refresh:ip",      points: 200, duration: 900,  blockDuration: 300  },
  google:         { key: "google:ip",       points: 30,  duration: 900,  blockDuration: 900  },
} as const satisfies Record<string, LimitRule>;

const limiters = new Map<string, RateLimiterAbstract>();

function limiterFor(rule: LimitRule): RateLimiterAbstract {
  const existing = limiters.get(rule.key);
  if (existing) return existing;

  const redis = getRedis();
  const opts = {
    keyPrefix: `${KEY_PREFIX}:${rule.key}`,
    points: rule.points,
    duration: rule.duration,
    blockDuration: rule.blockDuration,
  };

  const limiter = redis
    ? new RateLimiterRedis({ ...opts, storeClient: redis })
    : new RateLimiterMemory(opts);

  limiters.set(rule.key, limiter);
  return limiter;
}

function tooMany(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export type LimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

// Spends one point against `rule` for `subject`. Redis being unreachable
// ALLOWS the request: a limiter outage must not take authentication down with
// it. Redis is on a private network, so the exposure is small.
export async function consume(
  rule: LimitRule,
  subject: string
): Promise<LimitResult> {
  try {
    await limiterFor(rule).consume(subject);
    return { ok: true };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return { ok: false, response: tooMany(Math.ceil(err.msBeforeNext / 1000)) };
    }
    // A missing REDIS_URL is a deployment fault, not an outage. Failing open
    // here would silently disable every limit in production, so it propagates
    // and the endpoint 500s loudly instead.
    if (err instanceof RedisMisconfiguredError) throw err;

    console.error("[RATE_LIMIT_UNAVAILABLE]", rule.key, err);
    return { ok: true };
  }
}

// Checks per-IP, then optionally per-account. Call at the very top of a handler.
export async function rateLimit(
  req: Request,
  ipRule: LimitRule,
  account?: { rule: LimitRule; subject: string }
): Promise<LimitResult> {
  const byIp = await consume(ipRule, clientIp(req));
  if (!byIp.ok) return byIp;

  if (account?.subject) {
    return consume(account.rule, account.subject.toLowerCase().trim());
  }
  return { ok: true };
}

// Clears a bucket — used on successful login so honest users who mistyped a
// few times do not stay penalised.
export async function resetLimit(
  rule: LimitRule,
  subject: string
): Promise<void> {
  try {
    await limiterFor(rule).delete(subject.toLowerCase().trim());
  } catch (err) {
    console.error("[RATE_LIMIT_RESET_FAILED]", rule.key, err);
  }
}
