import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import { runMigrations } from "../../../db/migrate";
import { PostgresLinkStore } from "@/lib/db/postgres-store";
import type { NewLinkRecord } from "@/lib/db/types";

const CONNECTION = process.env.DATABASE_URL_TEST;
const enabled = Boolean(CONNECTION);

function makeRecord(slug: string, memo: string): NewLinkRecord {
  return {
    id: randomUUID(),
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

describe.skipIf(!enabled)("PostgresLinkStore", () => {
  let pool: Pool;
  let store: PostgresLinkStore;

  beforeAll(async () => {
    await runMigrations(CONNECTION as string);
    pool = new Pool({ connectionString: CONNECTION });
    store = new PostgresLinkStore(pool);
  }, 30000);

  afterAll(async () => {
    await store.close();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE payment_links");
  });

  it("creates and finds links by slug and memo", async () => {
    const created = await store.create(makeRecord("pg-slug-001", "PGMEMO000001"));
    expect(created.status).toBe("pending");
    expect((await store.findBySlug("pg-slug-001"))?.id).toBe(created.id);
    expect((await store.findByMemo("PGMEMO000001"))?.id).toBe(created.id);
  });

  it("round-trips a credit asset and timestamps", async () => {
    const record = {
      ...makeRecord("pg-slug-002", "PGMEMO000002"),
      asset: {
        type: "credit_alphanum",
        code: "USDC",
        issuer: "GASWREU6QAL7XJ3WTKRUZH7J5UA25QEN34CMOYC6SADAUWFSD5L5M3TZ",
      } as const,
      description: "hello",
      expiresAt: "2026-10-01T00:00:00.000Z",
    };
    const created = await store.create(record);
    expect(created.asset).toEqual(record.asset);
    expect(created.description).toBe("hello");
    expect(created.expiresAt).toBe("2026-10-01T00:00:00.000Z");
    expect(created.createdAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("returns null for unknown slugs, memos and hashes", async () => {
    expect(await store.findBySlug("pg-missing")).toBeNull();
    expect(await store.findByMemo("PGMISSING0000")).toBeNull();
    expect(await store.findByTransactionHash("d".repeat(64))).toBeNull();
  });

  it("marks a pending link as paid and finds it by hash", async () => {
    await store.create(makeRecord("pg-slug-003", "PGMEMO000003"));
    const result = await store.markPaid(
      "pg-slug-003",
      "a".repeat(64),
      "2026-09-02T00:00:00.000Z"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.link.status).toBe("paid");
      expect(result.link.transactionHash).toBe("a".repeat(64));
      expect(result.link.paidAt).toBe("2026-09-02T00:00:00.000Z");
    }
    expect((await store.findByTransactionHash("a".repeat(64)))?.slug).toBe(
      "pg-slug-003"
    );
  });

  it("rejects paying twice and paying an expired link", async () => {
    await store.create(makeRecord("pg-slug-004", "PGMEMO000004"));
    await store.markPaid("pg-slug-004", "b".repeat(64), "2026-09-02T00:00:00.000Z");
    expect(
      await store.markPaid("pg-slug-004", "b".repeat(64), "2026-09-02T00:00:01.000Z")
    ).toEqual({ ok: false, code: "ALREADY_PAID" });

    await store.create(makeRecord("pg-slug-005", "PGMEMO000005"));
    await pool.query(
      "UPDATE payment_links SET status = 'expired' WHERE slug = 'pg-slug-005'"
    );
    expect(
      await store.markPaid("pg-slug-005", "c".repeat(64), "2026-09-02T00:00:00.000Z")
    ).toEqual({ ok: false, code: "EXPIRED" });
  });

  it("rejects reusing a transaction hash on a different link", async () => {
    await store.create(makeRecord("pg-slug-006", "PGMEMO000006"));
    await store.create(makeRecord("pg-slug-007", "PGMEMO000007"));
    await store.markPaid("pg-slug-006", "e".repeat(64), "2026-09-02T00:00:00.000Z");
    expect(
      await store.markPaid("pg-slug-007", "e".repeat(64), "2026-09-02T00:00:00.000Z")
    ).toEqual({ ok: false, code: "ALREADY_PAID" });
  });

  it("lets exactly one concurrent markPaid win", async () => {
    await store.create(makeRecord("pg-slug-008", "PGMEMO000008"));
    const hashes = Array.from({ length: 10 }, (_, i) =>
      `${i.toString(16).padStart(1, "0")}${"f".repeat(63)}`.slice(-64)
    );
    const results = await Promise.all(
      hashes.map((hash) =>
        store.markPaid("pg-slug-008", hash, "2026-09-02T00:00:00.000Z")
      )
    );
    expect(results.filter((r) => r.ok).length).toBe(1);
    expect(
      results.filter((r) => !r.ok && r.code === "ALREADY_PAID").length
    ).toBe(9);
  });

  it("enforces slug uniqueness at the database level", async () => {
    await store.create(makeRecord("pg-slug-009", "PGMEMO000009"));
    await expect(
      store.create(makeRecord("pg-slug-009", "PGMEMO000010"))
    ).rejects.toThrow();
  });
});
