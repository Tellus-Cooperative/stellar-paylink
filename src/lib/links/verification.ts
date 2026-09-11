import type { Horizon } from "@stellar/stellar-sdk";

import type { PaymentLinkRecord } from "@/lib/db/types";
import { parseAmount, sameAmount } from "@/lib/payments/amount";
import { normalizeBalanceLineAsset, sameSupportedAsset } from "@/lib/stellar/assets";

export interface NetworkTransactionDetails {
  hash: string;
  successful: boolean;
  memo: string | null;
  memoType: string;
  ledgerCloseTime: string;
  payments: NetworkPayment[];
}

export interface NetworkPayment {
  from: string;
  to: string;
  toMuxed?: string;
  amount: string;
  asset: { type: string; code?: string; issuer?: string };
  successful: boolean;
}

export function mapTransactionDetails(
  tx: Horizon.ServerApi.TransactionRecord,
  operations: Horizon.ServerApi.PaymentOperationRecord[]
): NetworkTransactionDetails {
  return {
    hash: tx.hash,
    successful: tx.successful,
    memo: tx.memo ?? null,
    memoType: tx.memo_type,
    ledgerCloseTime: tx.created_at,
    payments: operations.map((op) => ({
      from: op.from,
      to: op.to,
      toMuxed: op.to_muxed,
      amount: op.amount,
      asset: {
        type: op.asset_type,
        code: op.asset_code,
        issuer: op.asset_issuer,
      },
      successful: op.transaction_successful,
    })),
  };
}

export type VerificationResult =
  | { ok: true; matchedPayment: NetworkPayment }
  | {
      ok: false;
      code:
        | "TRANSACTION_NOT_FOUND"
        | "TRANSACTION_FAILED"
        | "MEMO_MISMATCH"
        | "PAYMENT_MISMATCH"
        | "OUTSIDE_PAYMENT_WINDOW"
        | "HASH_ALREADY_USED";
    };

function amountMatches(link: PaymentLinkRecord, amount: string): boolean {
  const expected = parseAmount(link.amount);
  if (!expected.ok) {
    return false;
  }
  return sameAmount(expected.normalized, amount);
}

export function evaluateVerification(
  link: PaymentLinkRecord,
  tx: NetworkTransactionDetails,
  now: Date
): VerificationResult {
  if (!tx.successful) {
    return { ok: false, code: "TRANSACTION_FAILED" };
  }

  if (tx.memoType !== "text" || tx.memo !== link.memo) {
    return { ok: false, code: "MEMO_MISMATCH" };
  }

  const closeAt = new Date(tx.ledgerCloseTime).getTime();
  const createdAt = new Date(link.createdAt).getTime();
  if (closeAt < createdAt) {
    return { ok: false, code: "OUTSIDE_PAYMENT_WINDOW" };
  }
  if (link.expiresAt) {
    const expiresAt = new Date(link.expiresAt).getTime();
    if (closeAt > expiresAt) {
      return { ok: false, code: "OUTSIDE_PAYMENT_WINDOW" };
    }
  }
  if (now.getTime() < closeAt) {
    return { ok: false, code: "OUTSIDE_PAYMENT_WINDOW" };
  }

  const expectedAsset =
    link.asset.type === "native"
      ? { type: "native" }
      : { type: "credit_alphanum", code: link.asset.code, issuer: link.asset.issuer };

  const matched = tx.payments.find((op) => {
    if (!op.successful) {
      return false;
    }
    if (op.toMuxed) {
      return false;
    }
    if (op.to !== link.destination) {
      return false;
    }
    const opAsset = normalizeBalanceLineAsset(
      op.asset.type,
      op.asset.code,
      op.asset.issuer
    );
    if (!sameSupportedAsset(opAsset, expectedAsset as never)) {
      return false;
    }
    if (!amountMatches(link, op.amount)) {
      return false;
    }
    return true;
  });

  if (!matched) {
    return { ok: false, code: "PAYMENT_MISMATCH" };
  }

  return { ok: true, matchedPayment: matched };
}

export interface VerifiedReceipt {
  transactionHash: string;
  asset: string;
  amount: string;
  paidAt: string;
  explorerUrl: string;
}

export function buildReceipt(
  link: PaymentLinkRecord,
  explorerUrl: string
): VerifiedReceipt {
  return {
    transactionHash: link.transactionHash ?? "",
    asset: link.asset.type === "native" ? "XLM" : link.asset.code,
    amount: link.amount,
    paidAt: link.paidAt ?? "",
    explorerUrl,
  };
}