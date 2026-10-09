import Redis from "ioredis";

// One client per process, cached across hot reloads like lib/db.ts does for Mongo.
declare global {
  var __redis: Redis | null | undefined;
}

// Thrown when the app is misconfigured, as opposed to Redis merely being down.
// Callers must NOT treat this as "limiter unavailable, allow the request".
export class RedisMisconfiguredError extends Error {
  constructor() {
    super(
      "REDIS_URL is not set. Rate limiting would fall back to per-process " +
        "memory, which stops being a limit as soon as there is more than one " +
        "instance."
    );
    this.name = "RedisMisconfiguredError";
  }
}

// Checked lazily, not at import: `next build` runs with NODE_ENV=production and
// would otherwise fail the build on a machine that has no Redis.
export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;

  if (!url) {
    if (process.env.NODE_ENV === "production") throw new RedisMisconfiguredError();
    return null; // dev: callers fall back to an in-memory limiter
  }

  if (!global.__redis) {
    global.__redis = new Redis(url, {
      // Queue during the initial connect so a cold start does not fail open,
      // but bound every command so a dead Redis costs ~0.5s, not a hung request.
      commandTimeout: 500,
      maxRetriesPerRequest: 1,
    });
    global.__redis.on("error", (err) => {
      console.error("[REDIS_ERROR]", err.message);
    });
  }
  return global.__redis;
}
