"use client";

import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

export class WalletError extends Error {
  readonly code: WalletErrorCode;

  constructor(code: WalletErrorCode, message: string) {
    super(message);
    this.name = "WalletError";
    this.code = code;
  }
}

export type WalletErrorCode =
  | "NOT_INSTALLED"
  | "ACCESS_DENIED"
  | "WRONG_NETWORK"
  | "SIGN_FAILED";

export interface WalletConnection {
  address: string;
  network: string;
  networkPassphrase: string;
}

const INSTALL_URL = "https://www.freighter.app/";

export const FREIGHTER_INSTALL_URL = INSTALL_URL;

export async function isFreighterAvailable(): Promise<boolean> {
  try {
    const result = await isConnected();
    return Boolean(result.isConnected) && !result.error;
  } catch {
    return false;
  }
}

/**
 * Prompts Freighter for access and returns the active account plus the network
 * the wallet is currently pointed at. The caller decides whether that network
 * is acceptable — this helper never silently switches networks.
 */
export async function connectWallet(): Promise<WalletConnection> {
  if (!(await isFreighterAvailable())) {
    throw new WalletError(
      "NOT_INSTALLED",
      "Freighter was not detected in this browser."
    );
  }

  const access = await requestAccess();
  if (access.error || !access.address) {
    throw new WalletError(
      "ACCESS_DENIED",
      "Freighter did not grant access to an account."
    );
  }

  const network = await getNetwork();
  if (network.error) {
    throw new WalletError(
      "ACCESS_DENIED",
      "Could not read the network from Freighter."
    );
  }

  return {
    address: access.address,
    network: network.network,
    networkPassphrase: network.networkPassphrase,
  };
}

export async function getConnectedAddress(): Promise<string | null> {
  try {
    const result = await getAddress();
    if (result.error || !result.address) {
      return null;
    }
    return result.address;
  } catch {
    return null;
  }
}

export async function signWithFreighter(
  xdr: string,
  opts: { networkPassphrase: string; address: string }
): Promise<string> {
  const result = await signTransaction(xdr, opts);
  if (result.error || !result.signedTxXdr) {
    throw new WalletError(
      "SIGN_FAILED",
      "The transaction was not signed in Freighter."
    );
  }
  return result.signedTxXdr;
}

export function assertNetwork(
  connection: WalletConnection,
  expectedPassphrase: string
): void {
  if (connection.networkPassphrase !== expectedPassphrase) {
    throw new WalletError(
      "WRONG_NETWORK",
      `Freighter is on ${connection.network}. Switch it to Testnet to continue.`
    );
  }
}
