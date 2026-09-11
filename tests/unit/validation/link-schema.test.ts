import { afterEach, describe, expect, it } from "vitest";

import { createLinkRequestSchema } from "@/lib/validation/link-schema";

const VALID_DESTINATION =
  "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM";
const VALID_ISSUER =
  "GASWREU6QAL7XJ3WTKRUZH7J5UA25QEN34CMOYC6SADAUWFSD5L5M3TZ" as const;

function setUsdcEnv(): void {
  process.env.USDC_ASSET_CODE = "USDC";
  process.env.USDC_ASSET_ISSUER = VALID_ISSUER;
}

afterEach(() => {
  delete process.env.USDC_ASSET_CODE;
  delete process.env.USDC_ASSET_ISSUER;
});

describe("createLinkRequestSchema", () => {
  it("accepts a valid native payment link", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: { type: "native" },
      amount: "25.5",
      title: "Café con leche",
      description: "Gracias por la compra",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid USDC payment link with allowlisted issuer", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: { type: "credit_alphanum", code: "usdc", issuer: VALID_ISSUER },
      amount: "12.75",
      title: "Pages",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.asset).toEqual({
        type: "credit_alphanum",
        code: "USDC",
        issuer: VALID_ISSUER,
      });
    }
  });

  it("rejects an invalid destination", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: "GARBAGE",
      asset: { type: "native" },
      amount: "1",
      title: "T",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a muxed destination", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: `M${VALID_DESTINATION.slice(1)}`,
      asset: { type: "native" },
      amount: "1",
      title: "T",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a credit asset without an issuer", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: { type: "credit_alphanum", code: "USDC" },
      amount: "1",
      title: "T",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an issuer that is not a Stellar address", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: {
        type: "credit_alphanum",
        code: "USDC",
        issuer: "not-an-issuer",
      },
      amount: "1",
      title: "T",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an asset that is not allowlisted", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: {
        type: "credit_alphanum",
        code: "FART",
        issuer: VALID_ISSUER,
      },
      amount: "1",
      title: "T",
    });
    expect(result.success).toBe(false);
  });

  it("rejects amounts that are negative or malformed", () => {
    setUsdcEnv();
    for (const amount of ["-1", "1.12345678", "abc", ""]) {
      const result = createLinkRequestSchema.safeParse({
        destination: VALID_DESTINATION,
        asset: { type: "native" },
        amount,
        title: "T",
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects an empty or oversized title", () => {
    setUsdcEnv();
    const empty = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: { type: "native" },
      amount: "1",
      title: "   ",
    });
    expect(empty.success).toBe(false);

    const oversized = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: { type: "native" },
      amount: "1",
      title: "A".repeat(121),
    });
    expect(oversized.success).toBe(false);
  });

  it("rejects an invalid expiration date", () => {
    setUsdcEnv();
    const result = createLinkRequestSchema.safeParse({
      destination: VALID_DESTINATION,
      asset: { type: "native" },
      amount: "1",
      title: "T",
      expiresAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});