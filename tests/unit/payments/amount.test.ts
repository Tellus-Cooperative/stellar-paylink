import { describe, expect, it } from "vitest";

import { formatStroops, parseAmount, sameAmount } from "@/lib/payments/amount";

describe("parseAmount", () => {
  it("accepts a native decimal amount", () => {
    const result = parseAmount("25.5");
    expect(result).toEqual({ ok: true, normalized: "25.5", stroops: 255000000n });
  });

  it("normalizes trailing zeros", () => {
    expect(parseAmount("100.0000000")).toEqual({
      ok: true,
      normalized: "100",
      stroops: 1000000000n,
    });
  });

  it("normalizes leading zeros in the integer part", () => {
    expect(parseAmount("0.5")).toEqual({
      ok: true,
      normalized: "0.5",
      stroops: 5000000n,
    });
  });

  it("rejects an amount with more than 7 decimal places", () => {
    expect(parseAmount("1.12345678")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
  });

  it("rejects zero and negative amounts", () => {
    expect(parseAmount("0")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
    expect(parseAmount("0.0000000")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
    expect(parseAmount("-5")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
  });

  it("rejects malformed amounts", () => {
    expect(parseAmount("")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
    expect(parseAmount(".5")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
    expect(parseAmount("1e3")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
    expect(parseAmount("1,5")).toEqual({ ok: false, code: "AMOUNT_INVALID" });
  });

  it("rejects amounts beyond the stroop integer range", () => {
    expect(parseAmount("9223372036.854775808")).toEqual({
      ok: false,
      code: "AMOUNT_INVALID",
    });
  });
});

describe("formatStroops", () => {
  it("round-trips a parsed amount", () => {
    const parsed = parseAmount("3.1400000");
    if (!parsed.ok) {
      throw new Error("expected parse to succeed");
    }
    expect(formatStroops(parsed.stroops)).toBe("3.14");
  });

  it("accepts the maximum stroop value", () => {
    const parsed = parseAmount("922337203685.4775807");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.stroops).toBe(9223372036854775807n);
    }
  });

  it("rejects an amount one stroop beyond the maximum", () => {
    expect(parseAmount("922337203685.4775808").ok).toBe(false);
  });
});

describe("sameAmount", () => {
  it("compares normalized decimals", () => {
    expect(sameAmount("10.5", "10.500")).toBe(true);
    expect(sameAmount("10.5", "10.6")).toBe(false);
    expect(sameAmount("10.5", "not-a-number")).toBe(false);
  });
});