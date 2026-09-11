import { afterEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  resetRateLimitsForTests,
} from "@/lib/api/rate-limit";

afterEach(() => {
  resetRateLimitsForTests();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const window = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimit("ip-1", window, 1000)).toEqual({ ok: true });
    expect(checkRateLimit("ip-1", window, 2000)).toEqual({ ok: true });
    expect(checkRateLimit("ip-1", window, 3000)).toEqual({ ok: true });
  });

  it("rejects requests beyond the limit with retry-after", () => {
    const window = { limit: 2, windowMs: 60_000 };
    expect(checkRateLimit("ip-2", window, 1000).ok).toBe(true);
    expect(checkRateLimit("ip-2", window, 2000).ok).toBe(true);
    const verdict = checkRateLimit("ip-2", window, 3000);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("resets after the window passes", () => {
    const window = { limit: 1, windowMs: 1000 };
    expect(checkRateLimit("ip-3", window, 1000).ok).toBe(true);
    expect(checkRateLimit("ip-3", window, 1500).ok).toBe(false);
    expect(checkRateLimit("ip-3", window, 2001)).toEqual({ ok: true });
  });

  it("tracks keys independently", () => {
    const window = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("ip-a", window, 1000).ok).toBe(true);
    expect(checkRateLimit("ip-b", window, 1000).ok).toBe(true);
    expect(checkRateLimit("ip-a", window, 1000).ok).toBe(false);
  });
});
