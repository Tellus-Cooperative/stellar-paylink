import type { NextRequest } from "next/server";

export interface RateLimitWindow {
  limit: number;
  windowMs: number;
}

export const CREATE_LINK_LIMIT: RateLimitWindow = { limit: 20, windowMs: 60_000 };
export const VERIFY_LINK_LIMIT: RateLimitWindow = { limit: 60, windowMs: 60_000 };

interface Bucket {
  count: number;
  resetAt: number;
}

const BUCKETS_KEY = Symbol.for("stellar-paylink.rate-limit-buckets");

type BucketStore = typeof globalThis & {
  [BUCKETS_KEY]?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  const store = globalThis as BucketStore;
  if (!store[BUCKETS_KEY]) {
    store[BUCKETS_KEY] = new Map<string, Bucket>();
  }
  return store[BUCKETS_KEY];
}

export type RateLimitVerdict =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  window: RateLimitWindow,
  now: number = Date.now()
): RateLimitVerdict {
  const map = buckets();
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + window.windowMs });
    prune(map, now);
    return { ok: true };
  }
  if (bucket.count < window.limit) {
    bucket.count += 1;
    return { ok: true };
  }
  return {
    ok: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000)
    ),
  };
}

function prune(map: Map<string, Bucket>, now: number): void {
  if (map.size < 5000) {
    return;
  }
  for (const [key, bucket] of map) {
    if (bucket.resetAt <= now) {
      map.delete(key);
    }
  }
}

export function resetRateLimitsForTests(): void {
  delete (globalThis as BucketStore)[BUCKETS_KEY];
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
