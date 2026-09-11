import {
  Account,
  BASE_FEE,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { memoFitsConstraints } from "@/lib/stellar/memo";
import { parseAmount } from "@/lib/payments/amount";
import { toStellarAsset, type SupportedAsset } from "@/lib/stellar/assets";

export const DEFAULT_TIMEOUT_SECONDS = 180;

export interface BuildPaymentParams {
  sourceAccount: Account;
  destination: string;
  asset: SupportedAsset;
  amount: string;
  memo: string;
  networkPassphrase: string;
  baseFee?: string;
  timeoutSeconds?: number;
}

/**
 * Builds the unsigned payment transaction the payer signs in their wallet.
 * The memo is the link reference: without it the payment cannot be matched
 * back to the link during verification.
 */
export function buildPaymentTransactionXdr({
  sourceAccount,
  destination,
  asset,
  amount,
  memo,
  networkPassphrase,
  baseFee = BASE_FEE,
  timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
}: BuildPaymentParams): string {
  if (!memoFitsConstraints(memo)) {
    throw new Error(`Invalid memo reference: ${memo}`);
  }

  const parsed = parseAmount(amount);
  if (!parsed.ok || parsed.stroops <= 0n) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase,
    memo: Memo.text(memo),
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: toStellarAsset(asset),
        amount: parsed.normalized,
      })
    )
    .setTimeout(timeoutSeconds)
    .build();

  return transaction.toXDR();
}
