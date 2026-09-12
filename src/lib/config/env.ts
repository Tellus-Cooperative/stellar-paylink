import { z } from "zod";

import { StrKey } from "@stellar/stellar-sdk";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  STELLAR_NETWORK: z.enum(["testnet"]).default("testnet"),
  STELLAR_HORIZON_URL: z
    .string()
    .url()
    .default("https://horizon-testnet.stellar.org"),
  USDC_ASSET_CODE: z.string().regex(/^[A-Za-z0-9]{1,12}$/).default("USDC"),
  USDC_ASSET_ISSUER: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

const emptyToUndefined = (value: string | undefined) =>
  value?.trim() === "" ? undefined : value;

export const STELLAR_TESTNET_PASSPHRASE =
  "Test SDF Network ; September 2015";

export function loadEnv(): EnvConfig {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: emptyToUndefined(process.env.NEXT_PUBLIC_APP_URL),
    STELLAR_NETWORK: emptyToUndefined(process.env.STELLAR_NETWORK),
    STELLAR_HORIZON_URL: emptyToUndefined(process.env.STELLAR_HORIZON_URL),
    USDC_ASSET_CODE: emptyToUndefined(process.env.USDC_ASSET_CODE),
    USDC_ASSET_ISSUER: emptyToUndefined(process.env.USDC_ASSET_ISSUER),
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(
        parsed.error.flatten().fieldErrors
      )}`
    );
  }
  const cfg = parsed.data;
  if (!cfg.DATABASE_URL?.trim()) {
    delete cfg.DATABASE_URL;
  }
  const issuer = cfg.USDC_ASSET_ISSUER?.trim();
  if (issuer && !StrKey.isValidEd25519PublicKey(issuer)) {
    throw new Error(
      `USDC_ASSET_ISSUER is not a valid Stellar public address: ${issuer}`
    );
  }
  return cfg;
}

export function config() {
  return loadEnv();
}