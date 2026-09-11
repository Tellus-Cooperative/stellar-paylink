import { describe, expect, it } from "vitest";

import { createPaymentLink, deriveStatus } from "@/lib/links/service";
import { InMemoryLinkStore } from "@/lib/db/memory-store";
import type { PaymentLinkRecord } from "@/lib/db/types";

function makeLink(createdAt: string): PaymentLinkRecord {
  return {
    id: "link-1",
    slug: "abc123456789",
    destination: "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM",
    network: "testnet",
    asset: { type: "native" },
    amount: "1",
    memo: "PLTEST12345678",
    title: "Test",
    description: null,
    expiresAt: null,
    createdAt,
    status: "pending",
    transactionHash: null,
    paidAt: null,
  };
}

describe("deriveStatus", () => {
  it("keeps a pending link pending before expiry", () => {
    const link = makeLink("2026-09-01T00:00:00.000Z");
    expect(deriveStatus(link, new Date("2026-09-02T00:00:00.000Z"))).toBe(
      "pending"
    );
  });

  it("marks an expired link when the deadline passes", () => {
    const link = makeLink("2026-09-01T00:00:00.000Z");
    link.expiresAt = "2026-09-02T00:00:00.000Z";
    expect(
      deriveStatus(link, new Date("2026-09-02T00:00:01.000Z"))
    ).toBe("expired");
  });

  it("keeps a paid link paid after expiration", () => {
    const link = makeLink("2026-09-01T00:00:00.000Z");
    link.status = "paid";
    link.expiresAt = "2026-09-01T00:00:00.000Z";
    expect(deriveStatus(link, new Date("2026-09-02T00:00:00.000Z"))).toBe(
      "paid"
    );
  });
});

describe("createPaymentLink", () => {
  it("creates a link with a slug, memo and normalized amount", async () => {
    const store = new InMemoryLinkStore();
    const result = await createPaymentLink(store, {
      destination: "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM",
      asset: { type: "native" },
      amount: "10.5000000",
      title: "Test",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.link.amount).toBe("10.5");
    expect(result.link.memo.startsWith("PL")).toBe(true);
    expect(result.link.memo.length).toBeLessThanOrEqual(28);
    expect(result.link.slug.length).toBeGreaterThanOrEqual(8);
    expect(result.paymentUrl).toMatch(/\/pay\//);
    expect(store.snapshot().length).toBe(1);
  });

  it("rejects an out-of-bounds amount", async () => {
    const store = new InMemoryLinkStore();
    const result = await createPaymentLink(store, {
      destination: "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM",
      asset: { type: "native" },
      amount: "1.12345678",
      title: "Test",
    });
    expect(result).toEqual({ ok: false, code: "AMOUNT_INVALID" });
  });

  it("generates unique memos across links", async () => {
    const store = new InMemoryLinkStore();
    const first = await createPaymentLink(store, {
      destination: "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM",
      asset: { type: "native" },
      amount: "1",
      title: "T",
    });
    const second = await createPaymentLink(store, {
      destination: "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM",
      asset: { type: "native" },
      amount: "2",
      title: "T",
    });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.link.memo).not.toBe(second.link.memo);
      expect(first.link.slug).not.toBe(second.link.slug);
    }
  });
});