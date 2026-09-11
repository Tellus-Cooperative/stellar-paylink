import { Asset } from "@stellar/stellar-sdk";

export type SupportedAsset =
  | { type: "native" }
  | { type: "credit_alphanum"; code: string; issuer: string };

export interface AssetConfig {
  native: boolean;
  usdc: SupportedAsset | null;
}

export function buildAssetConfig(usdc: {
  code: string;
  issuer: string;
} | null): AssetConfig {
  return {
    native: true,
    usdc: usdc ? { type: "credit_alphanum", code: usdc.code, issuer: usdc.issuer } : null,
  };
}

export function isSupportedAsset(
  asset: SupportedAsset,
  cfg: AssetConfig
): boolean {
  if (asset.type === "native") {
    return cfg.native;
  }
  const requested = asset;
  const allowed = cfg.usdc;
  if (allowed === null || allowed.type === "native") {
    return false;
  }
  return (
    requested.code.toUpperCase() === allowed.code.toUpperCase() &&
    requested.issuer === allowed.issuer
  );
}

export function toStellarAsset(asset: SupportedAsset): Asset {
  if (asset.type === "native") {
    return Asset.native();
  }
  return new Asset(asset.code, asset.issuer);
}

export function assetCodeAndIssuer(
  assetType: string,
  assetCode?: string,
  assetIssuer?: string
): SupportedAsset {
  if (assetType === "native") {
    return { type: "native" };
  }
  return {
    type: "credit_alphanum",
    code: assetCode ?? "",
    issuer: assetIssuer ?? "",
  };
}

export function sameSupportedAsset(a: SupportedAsset, b: SupportedAsset): boolean {
  if (a.type === "native" && b.type === "native") {
    return true;
  }
  if (a.type === "credit_alphanum" && b.type === "credit_alphanum") {
    return (
      a.code.toUpperCase() === b.code.toUpperCase() && a.issuer === b.issuer
    );
  }
  return false;
}

export function isCreditAssetType(assetType: string): boolean {
  return (
    assetType === "credit_alphanum4" || assetType === "credit_alphanum12"
  );
}

export function normalizeBalanceLineAsset(
  assetType: string,
  assetCode?: string,
  assetIssuer?: string
): SupportedAsset {
  return assetCodeAndIssuer(assetType, assetCode, assetIssuer);
}