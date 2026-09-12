import { Horizon } from "@stellar/stellar-sdk";

import { config, STELLAR_TESTNET_PASSPHRASE } from "@/lib/config/env";

export interface StellarNetworkConfig {
  network: string;
  passphrase: string;
  horizonUrl: string;
}

export function stellarNetworkConfig(): StellarNetworkConfig {
  const cfg = config();
  return {
    network: cfg.STELLAR_NETWORK,
    passphrase: STELLAR_TESTNET_PASSPHRASE,
    horizonUrl: cfg.STELLAR_HORIZON_URL,
  };
}

export function createHorizonClient(): Horizon.Server {
  const { horizonUrl } = stellarNetworkConfig();
  return new Horizon.Server(horizonUrl, { appName: "Stellar HareLink" });
}

export function explorerTransactionUrl(
  network: string,
  transactionHash: string
): string {
  return `https://stellar.expert/explorer/${network}/tx/${transactionHash}`;
}