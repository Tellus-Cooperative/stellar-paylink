import { describe, expect, it } from "vitest";
import {
  Account,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { buildPaymentTransactionXdr } from "@/lib/stellar/payment-tx";

const SOURCE = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const DESTINATION = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function newSource(sequence = "1234") {
  return new Account(SOURCE, sequence);
}

describe("buildPaymentTransactionXdr", () => {
  it("builds a single native payment operation with the link memo", () => {
    const xdr = buildPaymentTransactionXdr({
      sourceAccount: newSource(),
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "25.0000000",
      memo: "PLABCDEFGHJKMNPQ",
      networkPassphrase: Networks.TESTNET,
    });

    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET) as Transaction;
    expect(tx.operations).toHaveLength(1);
    const op = tx.operations[0] as Operation.Payment;
    expect(op.type).toBe("payment");
    expect(op.destination).toBe(DESTINATION);
    expect(op.amount).toBe("25.0000000");
    expect(op.asset.isNative()).toBe(true);
    expect(tx.memo.type).toBe(Memo.text("x").type);
    expect(Buffer.from(tx.memo.value as Uint8Array).toString("utf8")).toBe(
      "PLABCDEFGHJKMNPQ"
    );
  });

  it("builds a credit asset payment with code and issuer", () => {
    const xdr = buildPaymentTransactionXdr({
      sourceAccount: newSource(),
      destination: DESTINATION,
      asset: { type: "credit_alphanum", code: "USDC", issuer: USDC_ISSUER },
      amount: "10.5000000",
      memo: "PLZZZZZZZZZZZZZZ",
      networkPassphrase: Networks.TESTNET,
    });

    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET) as Transaction;
    const op = tx.operations[0] as Operation.Payment;
    expect(op.asset.getCode()).toBe("USDC");
    expect(op.asset.getIssuer()).toBe(USDC_ISSUER);
    expect(op.amount).toBe("10.5000000");
  });

  it("increments the source sequence number by one", () => {
    const xdr = buildPaymentTransactionXdr({
      sourceAccount: newSource("1234"),
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "1.0000000",
      memo: "PLAAAAAAAAAAAAAA",
      networkPassphrase: Networks.TESTNET,
    });

    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET) as Transaction;
    expect(tx.sequence).toBe("1235");
    expect(tx.source).toBe(SOURCE);
  });

  it("sets a bounded timebound so the transaction cannot linger", () => {
    const xdr = buildPaymentTransactionXdr({
      sourceAccount: newSource(),
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "1.0000000",
      memo: "PLAAAAAAAAAAAAAA",
      networkPassphrase: Networks.TESTNET,
      timeoutSeconds: 120,
    });

    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET) as Transaction;
    expect(tx.timeBounds).toBeDefined();
    const maxTime = Number(tx.timeBounds!.maxTime);
    const now = Math.floor(Date.now() / 1000);
    expect(maxTime).toBeGreaterThan(now);
    expect(maxTime).toBeLessThanOrEqual(now + 121);
  });

  it("rejects a memo that does not fit Stellar MEMO_TEXT constraints", () => {
    expect(() =>
      buildPaymentTransactionXdr({
        sourceAccount: newSource(),
        destination: DESTINATION,
        asset: { type: "native" },
        amount: "1.0000000",
        memo: "P".repeat(29),
        networkPassphrase: Networks.TESTNET,
      })
    ).toThrow(/memo/i);
  });

  it("rejects an amount that is not a valid Stellar amount", () => {
    expect(() =>
      buildPaymentTransactionXdr({
        sourceAccount: newSource(),
        destination: DESTINATION,
        asset: { type: "native" },
        amount: "0",
        memo: "PLAAAAAAAAAAAAAA",
        networkPassphrase: Networks.TESTNET,
      })
    ).toThrow(/amount/i);
  });
});
