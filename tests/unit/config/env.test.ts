import { afterEach, describe, expect, it } from "vitest";

import { loadEnv } from "@/lib/config/env";

const VERCEL_EMPTY_ENV_KEYS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "STELLAR_NETWORK",
  "STELLAR_HORIZON_URL",
  "USDC_ASSET_CODE",
  "USDC_ASSET_ISSUER",
] as const;

afterEach(() => {
  for (const key of VERCEL_EMPTY_ENV_KEYS) {
    delete process.env[key];
  }
});

describe("loadEnv", () => {
  it("applies defaults when Vercel exports empty strings", () => {
    for (const key of VERCEL_EMPTY_ENV_KEYS) {
      process.env[key] = "";
    }
    const cfg = loadEnv();
    expect(cfg.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(cfg.STELLAR_NETWORK).toBe("testnet");
    expect(cfg.STELLAR_HORIZON_URL).toBe("https://horizon-testnet.stellar.org");
    expect(cfg.USDC_ASSET_CODE).toBe("USDC");
    expect(cfg.USDC_ASSET_ISSUER).toBeUndefined();
  });

  it("trims whitespace-only values before applying defaults", () => {
    process.env.NEXT_PUBLIC_APP_URL = "   ";
    process.env.STELLAR_NETWORK = "";
    const cfg = loadEnv();
    expect(cfg.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(cfg.STELLAR_NETWORK).toBe("testnet");
  });

  it("rejects a genuinely invalid URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "not-a-url";
    expect(() => loadEnv()).toThrow(/Invalid environment configuration/);
  });
});