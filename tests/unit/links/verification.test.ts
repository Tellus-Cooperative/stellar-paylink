import { describe, expect, it } from "vitest";

import type { PaymentLinkRecord } from "@/lib/db/types";
import {
  evaluateVerification,
  type NetworkTransactionDetails,
} from "@/lib/links/verification";

const DESTINATION =
  "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM";
const SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function makeLink(overrides: Partial<PaymentLinkRecord> = {}): PaymentLinkRecord {
  return {
    id: "link-1",
    slug: "abc123456789",
    destination: DESTINATION,
    network: "testnet",
    asset: { type: "native" },
    amount: "25.5",
    memo: "PLTEST12345678",
    title: "Test",
    description: null,
    expiresAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    status: "pending",
    transactionHash: null,
    paidAt: null,
    ...overrides,
  };
}

function makeTx(overrides: Partial<NetworkTransactionDetails> = {}): NetworkTransactionDetails {
  return {
    hash: "a".repeat(64),
    successful: true,
    memo: "PLTEST12345678",
    memoType: "text",
    ledgerCloseTime: "2026-09-02T00:00:00.000Z",
    payments: [
      {
        from: SOURCE,
        to: DESTINATION,
        amount: "25.5",
        asset: { type: "native" },
        successful: true,
      },
    ],
    ...overrides,
  };
}

const NOW = new Date("2026-09-03T00:00:00.000Z");

describe("evaluateVerification", () => {
  it("verifies a matching payment", () => {
    const result = evaluateVerification(makeLink(), makeTx(), NOW);
    expect(result.ok).toBe(true);
  });

  it("rejects a failed transaction", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({ successful: false }),
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a transaction without the link memo", () => {
    expect(
      evaluateVerification(makeLink(), makeTx({ memo: "OTHER" }), NOW).ok
    ).toBe(false);
    expect(
      evaluateVerification(makeLink(), makeTx({ memoType: "id", memo: null }), NOW).ok
    ).toBe(false);
    expect(
      evaluateVerification(makeLink(), makeTx({ memo: null }), NOW).ok
    ).toBe(false);
  });

  it("rejects a payment to a different destination", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: SOURCE,
            amount: "25.5",
            asset: { type: "native" },
            successful: true,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("ignores muxed payments to the same destination", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: DESTINATION,
            toMuxed: `M${DESTINATION.slice(1)}`,
            amount: "25.5",
            asset: { type: "native" },
            successful: true,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a payment with the wrong amount", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: DESTINATION,
            amount: "25.51",
            asset: { type: "native" },
            successful: true,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("matches amounts with different precision", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: DESTINATION,
            amount: "25.5000000",
            asset: { type: "native" },
            successful: true,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(true);
  });

  it("matches a credit asset by code and issuer", () => {
    const link = makeLink({
      asset: {
        type: "credit_alphanum",
        code: "USDC",
        issuer:
          "GASWREU6QAL7XJ3WTKRUZH7J5UA25QEN34CMOYC6SADAUWFSD5L5M3TZ",
      },
    });
    const result = evaluateVerification(
      link,
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: DESTINATION,
            amount: "25.5",
            asset: {
              type: "credit_alphanum",
              code: "USDC",
              issuer:
                "GASWREU6QAL7XJ3WTKRUZH7J5UA25QEN34CMOYC6SADAUWFSD5L5M3TZ",
            },
            successful: true,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a credit payment from a different issuer", () => {
    const link = makeLink({
      asset: {
        type: "credit_alphanum",
        code: "USDC",
        issuer:
          "GASWREU6QAL7XJ3WTKRUZH7J5UA25QEN34CMOYC6SADAUWFSD5L5M3TZ",
      },
    });
    const result = evaluateVerification(
      link,
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: DESTINATION,
            amount: "25.5",
            asset: {
              type: "credit_alphanum",
              code: "USDC",
              issuer:
                "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM",
            },
            successful: true,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a payment closed before the link was created", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({ ledgerCloseTime: "2026-08-31T00:00:00.000Z" }),
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a payment closed after expiration", () => {
    const link = makeLink({
      expiresAt: "2026-09-02T12:00:00.000Z",
    });
    const result = evaluateVerification(
      link,
      makeTx({ ledgerCloseTime: "2026-09-02T13:00:00.000Z" }),
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("matches the correct operation when several payments exist", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: SOURCE,
            amount: "1",
            asset: { type: "native" },
            successful: true,
          },
          {
            from: SOURCE,
            to: DESTINATION,
            amount: "25.5",
            asset: { type: "native" },
            successful: true,
          },
          {
            from: SOURCE,
            to: DESTINATION,
            amount: "0.1",
            asset: { type: "native" },
            successful: true,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(true);
  });

  it("ignores failed operations in the same transaction", () => {
    const result = evaluateVerification(
      makeLink(),
      makeTx({
        payments: [
          {
            from: SOURCE,
            to: DESTINATION,
            amount: "25.5",
            asset: { type: "native" },
            successful: false,
          },
        ],
      }),
      NOW
    );
    expect(result.ok).toBe(false);
  });
});