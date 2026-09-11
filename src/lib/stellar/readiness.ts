import type { Horizon } from "@stellar/stellar-sdk";

import type { SupportedAsset } from "@/lib/stellar/assets";

export interface DestinationReadiness {
  accountExists: boolean;
  hasTrustline: boolean;
}

export async function checkDestinationReadiness(
  server: Horizon.Server,
  destination: string,
  asset: SupportedAsset
): Promise<DestinationReadiness> {
  let account;
  try {
    account = await server.loadAccount(destination);
  } catch {
    return { accountExists: false, hasTrustline: false };
  }
  if (asset.type === "native") {
    return { accountExists: true, hasTrustline: true };
  }
  const hasTrustline = account.balances.some((balance) => {
    if (
      balance.asset_type !== "credit_alphanum4" &&
      balance.asset_type !== "credit_alphanum12"
    ) {
      return false;
    }
    return (
      balance.asset_code === asset.code && balance.asset_issuer === asset.issuer
    );
  });
  return { accountExists: true, hasTrustline };
}