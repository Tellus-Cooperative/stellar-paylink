"use client";

import { useState } from "react";
import { Account, Horizon, TransactionBuilder } from "@stellar/stellar-sdk";

import { buildPaymentTransactionXdr } from "@/lib/stellar/payment-tx";
import {
  FREIGHTER_INSTALL_URL,
  WalletError,
  assertNetwork,
  connectWallet,
  signWithFreighter,
} from "@/lib/wallet/freighter";
import ReceiptView, { type ReceiptData } from "@/components/receipt-view";
import type { SupportedAsset } from "@/lib/stellar/assets";

export interface PayLinkView {
  slug: string;
  destination: string;
  asset: SupportedAsset;
  amount: string;
  memo: string;
  title: string;
  description: string | null;
  status: "pending" | "paid" | "expired";
  expiresAt: string | null;
  transactionHash: string | null;
}

export interface PayClientProps {
  link: PayLinkView;
  horizonUrl: string;
  networkPassphrase: string;
  networkLabel: string;
  explorerBaseUrl: string;
}

type Receipt = ReceiptData;

type Phase =
  | "idle"
  | "connecting"
  | "building"
  | "signing"
  | "submitting"
  | "verifying"
  | "done";

const PHASE_COPY: Record<Exclude<Phase, "idle" | "done">, string> = {
  connecting: "Waiting for Freighter…",
  building: "Building the transaction…",
  signing: "Sign it in Freighter…",
  submitting: "Submitting to Stellar…",
  verifying: "Confirming on-chain…",
};

const VERIFY_ERROR_COPY: Record<string, string> = {
  MEMO_MISMATCH:
    "The transaction went through but its memo does not match this link.",
  PAYMENT_MISMATCH:
    "The transaction went through but the amount, asset or destination does not match this link.",
  OUTSIDE_PAYMENT_WINDOW:
    "The payment landed outside this link's valid window.",
  HASH_ALREADY_USED: "That transaction was already used on another link.",
  ALREADY_PAID: "This link was already paid with a different transaction.",
  EXPIRED: "This link expired before the payment settled.",
  TRANSACTION_NOT_FOUND:
    "Stellar has not indexed the transaction yet. Retry in a few seconds.",
};

function assetLabel(asset: SupportedAsset): string {
  return asset.type === "native" ? "XLM" : asset.code;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PayClient({
  link,
  horizonUrl,
  networkPassphrase,
  networkLabel,
  explorerBaseUrl,
}: PayClientProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(
    link.status === "paid" && link.transactionHash
      ? {
          transactionHash: link.transactionHash,
          asset: assetLabel(link.asset),
          amount: link.amount,
          paidAt: "",
          explorerUrl: `${explorerBaseUrl}/${link.transactionHash}`,
        }
      : null
  );

  const busy = phase !== "idle" && phase !== "done";
  const settled = receipt !== null;

  /**
   * Verification races the ledger: Horizon may not have indexed the
   * transaction the instant submission returns, and `evaluateVerification`
   * rejects a ledger close time that is still in the future relative to the
   * server clock. Both resolve within a few seconds, so retry briefly.
   */
  async function verifyWithRetry(transactionHash: string): Promise<Receipt> {
    let lastCode = "TRANSACTION_NOT_FOUND";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(`/api/links/${link.slug}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionHash }),
      });
      const payload = await response.json();
      if (response.ok) {
        return payload.data.receipt as Receipt;
      }
      lastCode = payload?.error?.reason ?? payload?.error?.code ?? lastCode;
      if (
        lastCode !== "TRANSACTION_NOT_FOUND" &&
        lastCode !== "OUTSIDE_PAYMENT_WINDOW"
      ) {
        break;
      }
      await sleep(2000);
    }
    throw new Error(
      VERIFY_ERROR_COPY[lastCode] ??
        "The payment could not be verified against this link."
    );
  }

  async function pay() {
    setError(null);
    try {
      setPhase("connecting");
      const connection = await connectWallet();
      assertNetwork(connection, networkPassphrase);

      setPhase("building");
      const server = new Horizon.Server(horizonUrl, {
        appName: "Stellar Paylink",
      });
      const loaded = await server.loadAccount(connection.address);

      const xdr = buildPaymentTransactionXdr({
        // Horizon's AccountResponse is not the plain Account the builder wants.
        sourceAccount: new Account(
          loaded.accountId(),
          loaded.sequenceNumber()
        ),
        destination: link.destination,
        asset: link.asset,
        amount: link.amount,
        memo: link.memo,
        networkPassphrase,
      });

      setPhase("signing");
      const signedXdr = await signWithFreighter(xdr, {
        networkPassphrase,
        address: connection.address,
      });

      setPhase("submitting");
      const signed = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      const submission = await server.submitTransaction(signed);

      setPhase("verifying");
      const confirmed = await verifyWithRetry(submission.hash);

      setReceipt(confirmed);
      setPhase("done");
    } catch (caught) {
      setPhase("idle");
      if (caught instanceof WalletError) {
        setError(
          caught.code === "NOT_INSTALLED"
            ? `Freighter was not detected. Install it at ${FREIGHTER_INSTALL_URL} and reload.`
            : caught.message
        );
        return;
      }
      if (
        caught &&
        typeof caught === "object" &&
        "response" in caught &&
        (caught as { response?: { status?: number } }).response?.status === 404
      ) {
        setError(
          "Your account does not exist on this network yet. Fund it on Testnet first."
        );
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "The payment could not be completed."
      );
    }
  }

  if (settled) {
    return (
      <ReceiptView
        title={link.title}
        destination={link.destination}
        networkLabel={networkLabel}
        receipt={receipt}
      />
    );
  }

  const expired = link.status === "expired";

  return (
    <>
      <section className="paylink__builder" aria-label="Payment request">
        <div className="paylink__panel paylink__panel--form">
          <p className="paylink__preview-eyebrow">Payment request</p>
          <h2 className="paylink__result-title">{link.title}</h2>
          {link.description && (
            <p className="paylink__lede">{link.description}</p>
          )}

          <div className="paylink__preview-rows">
            <div className="paylink__preview-row">
              <span className="paylink__preview-row-label">Amount</span>
              <span className="paylink__preview-row-value">
                {link.amount} {assetLabel(link.asset)}
              </span>
            </div>
            <div className="paylink__preview-row">
              <span className="paylink__preview-row-label">Sent to</span>
              <span className="paylink__preview-row-value">
                {truncateAddress(link.destination)}
              </span>
            </div>
            <div className="paylink__preview-row">
              <span className="paylink__preview-row-label">Memo</span>
              <span className="paylink__preview-row-value">{link.memo}</span>
            </div>
            <div className="paylink__preview-row">
              <span className="paylink__preview-row-label">Network</span>
              <span className="paylink__preview-row-value">
                Stellar · {networkLabel}
              </span>
            </div>
            {link.expiresAt && (
              <div className="paylink__preview-row">
                <span className="paylink__preview-row-label">Expires</span>
                <span className="paylink__preview-row-value">
                  {new Date(link.expiresAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <p className="paylink__field-hint">
            You sign in your own wallet. Paylink never receives custody of the
            funds and cannot move them.
          </p>
        </div>

        <aside className="paylink__panel paylink__panel--preview">
          <div className="paylink__preview-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/paylink-pending.webp" alt="" aria-hidden />
            <span className="paylink__preview-status">
              <span className="paylink__status-dot" aria-hidden />
              {expired ? "Expired" : "Pending"}
            </span>
          </div>

          <div className="paylink__preview-body">
            <p className="paylink__preview-eyebrow">You are paying</p>
            <h2 className="paylink__preview-amount">
              {link.amount} <small>{assetLabel(link.asset)}</small>
            </h2>
            <p className="paylink__field-hint">
              The memo <strong>{link.memo}</strong> travels with the
              transaction. It is how the network proof gets matched back to this
              link.
            </p>
          </div>
        </aside>
      </section>

      {error && (
        <p className="paylink__error" role="alert">
          {error}
        </p>
      )}

      <section className="paylink__actions">
        <button
          className="paylink__primary"
          type="button"
          onClick={pay}
          disabled={busy || expired}
        >
          {expired
            ? "Link expired"
            : busy
              ? PHASE_COPY[phase as Exclude<Phase, "idle" | "done">]
              : "Pay with Freighter"}{" "}
          {!expired && <span aria-hidden>↗</span>}
        </button>
        <span className="paylink__tag">Non-custodial · {networkLabel}</span>
      </section>
    </>
  );
}
