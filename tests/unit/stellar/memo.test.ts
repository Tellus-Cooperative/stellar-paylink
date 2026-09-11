import { describe, expect, it } from "vitest";

import {
  generateMemoReference,
  memoFitsConstraints,
  randomReference,
} from "@/lib/stellar/memo";

describe("memo reference generation", () => {
  it("produces an alphanumeric reference within the 28-byte limit", () => {
    for (let i = 0; i < 50; i += 1) {
      const memo = generateMemoReference();
      expect(memoFitsConstraints(memo)).toBe(true);
      expect(Buffer.byteLength(memo, "utf8")).toBeLessThanOrEqual(28);
    }
  });

  it("prefixes the reference with PL", () => {
    expect(generateMemoReference().startsWith("PL")).toBe(true);
  });

  it("avoids ambiguous characters", () => {
    const ref = randomReference(100);
    expect(ref).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
  });

  it("rejects references that exceed the byte limit", () => {
    expect(memoFitsConstraints("A".repeat(29))).toBe(false);
    expect(memoFitsConstraints("Z".repeat(28))).toBe(true);
  });

  it("rejects non-alphanumeric memos", () => {
    expect(memoFitsConstraints("PL-123")).toBe(false);
  });
});