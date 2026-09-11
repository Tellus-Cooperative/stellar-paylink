import { z } from "zod";

import { isStellarPublicAddress, isMuxedAccount } from "@/lib/stellar/address";
import {
  buildAssetConfig,
  type SupportedAsset,
} from "@/lib/stellar/assets";
import { config } from "@/lib/config/env";
import { parseAmount } from "@/lib/payments/amount";

export const stellarAddressSchema = z
  .string()
  .min(1)
  .refine((value) => isStellarPublicAddress(value), {
    message: "Not a valid Stellar public address",
  })
  .refine((value) => !isMuxedAccount(value), {
    message: "Muxed accounts are not supported in v0.1",
  });

export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,7})?$/, {
    message: "Amount must be a decimal string with at most 7 decimal places",
  })
  .refine((value) => parseAmount(value).ok, {
    message: "Amount out of supported bounds",
  });

export const assetSchema: z.ZodType<SupportedAsset> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("native") }),
  z.object({
    type: z.literal("credit_alphanum"),
    code: z
      .string()
      .regex(/^[A-Za-z0-9]{1,12}$/)
      .transform((code) => code.toUpperCase()),
    issuer: stellarAddressSchema,
  }),
]);

export function makeAssetAllowlist(): SupportedAsset[] {
  const cfg = config();
  const assetCfg = buildAssetConfig(
    cfg.USDC_ASSET_ISSUER
      ? { code: cfg.USDC_ASSET_CODE, issuer: cfg.USDC_ASSET_ISSUER }
      : null
  );
  const allowlist: SupportedAsset[] = [{ type: "native" }];
  if (assetCfg.usdc) {
    allowlist.push(assetCfg.usdc);
  }
  return allowlist;
}

const titleSchema = z.string().trim().min(1, {
  message: "Title is required",
}).max(120, {
  message: "Title must be at most 120 characters",
});

const descriptionSchema = z
  .string()
  .trim()
  .max(500, { message: "Description must be at most 500 characters" })
  .nullable()
  .optional();

const expiresAtSchema = z
  .string()
  .datetime({ message: "Expiration must be a valid ISO date" })
  .nullable()
  .optional();

export const createLinkRequestSchema = z
  .object({
    destination: stellarAddressSchema,
    asset: assetSchema,
    amount: amountSchema,
    title: titleSchema,
    description: descriptionSchema,
    expiresAt: expiresAtSchema,
  })
  .superRefine((input, ctx) => {
    const parsed = parseAmount(input.amount);
    if (parsed.ok && parsed.stroops <= 0n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Amount must be greater than zero",
      });
    }
    const allowlist = makeAssetAllowlist();
    const requested = input.asset;
    const isAllowed = allowlist.some((allowed) => {
      if (allowed.type === "native") {
        return requested.type === "native";
      }
      if (requested.type === "credit_alphanum") {
        return (
          requested.code === allowed.code && requested.issuer === allowed.issuer
        );
      }
      return false;
    });
    if (!isAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["asset"],
        message: "Asset is not in the configured allowlist",
      });
    }
  });

export const transactionHashSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{64}$/, {
    message: "Transaction hash must be a 64-character hex string",
  });

export const slugSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, {
    message: "Invalid link slug",
  });