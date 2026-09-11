import { describe, expect, it } from "vitest";

import { InMemoryLinkStore } from "@/lib/db/memory-store";
import type { NewLinkRecord } from "@/lib/db/types";

function makeRecord(slug: string, memo: string): NewLinkRecord {
  return {
    id: `id-${slug}`,
    slug,
    destination: "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM",
    network: "testnet",
    asset: { type: "native" },
    amount: "1",
    memo,
    title: "Test",
    description: null,
    expiresAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
  };
}

describe("InMemoryLinkStore", () => {
  it("creates and finds links by slug and memo", async () => {
    const store = new InMemoryLinkStore();
    const created = await store.create(makeRecord("slug-123456", "PLABC12345678"));
    expect(created.status).toBe("pending");
    expect((await store.findBySlug("slug-123456"))?.id).toBe(created.id);
    expect((await store.findByMemo("PLABC12345678"))?.id).toBe(created.id);
  });

  it("returns null for unknown slugs and memos", async () => {
    const store = new InMemoryLinkStore();
    expect(await store.findBySlug("missing-slug")).toBeNull();
    expect(await store.findByMemo("PLMISSING00000")).toBeNull();
  });

  it("marks a pending link as paid", async () => {
    const store = new InMemoryLinkStore();
    const slug = "slug-123456";
    await store.create(makeRecord(slug, "PLABC12345678"));
    const result = await store.markPaid(
      slug,
      "a".repeat(64),
      "2026-09-02T00:00:00.000Z"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.link.status).toBe("paid");
      expect(result.link.transactionHash).toBe("a".repeat(64));
    }
  });

  it("keeps idempotency when the same link is paid twice with the same hash", async () => {
    const store = new InMemoryLinkStore();
    const slug = "slug-123456";
    await store.create(makeRecord(slug, "PLABC12345678"));
    await store.markPaid(slug, "a".repeat(64), "2026-09-02T00:00:00.000Z");
    const second = await store.markPaid(
      slug,
      "a".repeat(64),
      "2026-09-02T00:00:01.000Z"
    );
    expect(second).toEqual({ ok: false, code: "ALREADY_PAID" });
  });

  it("rejects paying an expired link", async () => {
    const store = new InMemoryLinkStore();
    const slug = "slug-123456";
    const { ...record } = makeRecord(slug, "PLABC12345678");
    const created = await store.create(record);
    created.status = "expired";
    const result = await store.markPaid(slug, "a".repeat(64), "2026-09-02T00:00:00.000Z");
    expect(result).toEqual({ ok: false, code: "EXPIRED" });
  });

  it("rejects reusing a transaction hash on a different link", async () => {
    const store = new InMemoryLinkStore();
    await store.create(makeRecord("slug-111111", "PLAAA11111111"));
    await store.create(makeRecord("slug-222222", "PLBBB22222222"));
    await store.markPaid("slug-111111", "b".repeat(64), "2026-09-02T00:00:00.000Z");
    const result = await store.markPaid(
      "slug-222222",
      "b".repeat(64),
      "2026-09-02T00:00:00.000Z"
    );
    expect(result).toEqual({ ok: false, code: "ALREADY_PAID" });
  });

  it("finds transactions by hash", async () => {
    const store = new InMemoryLinkStore();
    const slug = "slug-123456";
    await store.create(makeRecord(slug, "PLABC12345678"));
    await store.markPaid(slug, "c".repeat(64), "2026-09-02T00:00:00.000Z");
    expect((await store.findByTransactionHash("c".repeat(64)))?.slug).toBe(slug);
    expect(await store.findByTransactionHash("d".repeat(64))).toBeNull();
  });
});