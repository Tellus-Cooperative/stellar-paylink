import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as createLink } from "@/app/api/links/route";
import { GET as getLink } from "@/app/api/links/[slug]/route";
import { POST as verifyLink } from "@/app/api/links/[slug]/verify/route";
import { resetRateLimitsForTests } from "@/lib/api/rate-limit";
import {
  getLinkStore,
  resetLinkStoreForTests,
} from "@/lib/db/store";
import { createPaymentLink } from "@/lib/links/service";

const DESTINATION =
  "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM";
const NO_TRUSTLINE =
  "GDUDNC6WW5DZN4RMABTYPIQJLITG7PPVRFGXYKIOKLPMRAVUI2R7RP7U";
const USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function postRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function verifyContext(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  delete process.env.DATABASE_URL;
  resetLinkStoreForTests();
  resetRateLimitsForTests();
});

describe("POST /api/links", () => {
  it("creates a link storing only normalized server-approved values", async () => {
    const response = await createLink(
      postRequest("/api/links", {
        destination: DESTINATION,
        asset: { type: "native" },
        amount: "10.5000000",
        title: "  Spaced title  ",
        description: null,
        expiresAt: null,
        status: "paid",
        transactionHash: "a".repeat(64),
        memo: "FORGED",
        network: "mainnet",
      })
    );
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.data.link.amount).toBe("10.5");
    expect(payload.data.link.title).toBe("Spaced title");
    expect(payload.data.link.status).toBe("pending");
    expect(payload.data.link.memo).not.toBe("FORGED");
    expect(payload.data.link.memo).toMatch(/^PL[A-Z2-9]{14}$/);
    expect(payload.data.paymentUrl).toMatch(
      new RegExp(`/pay/${payload.data.link.slug}$`)
    );

    const stored = await getLinkStore().findBySlug(payload.data.link.slug);
    expect(stored?.transactionHash).toBeNull();
    expect(stored?.amount).toBe("10.5");
  }, 30000);

  it("rejects invalid requests without touching the store", async () => {
    const response = await createLink(
      postRequest("/api/links", {
        destination: "NOT_AN_ADDRESS",
        asset: { type: "native" },
        amount: "1",
        title: "Bad",
      })
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a credit asset when the destination lacks a trustline", async () => {
    process.env.USDC_ASSET_ISSUER = USDC_ISSUER;
    try {
      const response = await createLink(
        postRequest("/api/links", {
          destination: NO_TRUSTLINE,
          asset: { type: "credit_alphanum", code: "USDC", issuer: USDC_ISSUER },
          amount: "5",
          title: "No trustline",
        })
      );
      expect(response.status).toBe(422);
      expect((await response.json()).error.code).toBe("DESTINATION_NOT_READY");
    } finally {
      delete process.env.USDC_ASSET_ISSUER;
    }
  }, 30000);
});

describe("GET /api/links/[slug]", () => {
  it("returns public fields for an existing link", async () => {
    const store = getLinkStore();
    const created = await createPaymentLink(store, {
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "3",
      title: "Lookup",
    });
    if (!created.ok) {
      throw new Error("setup failed");
    }
    const response = await getLink(
      new NextRequest(`http://localhost/api/links/${created.link.slug}`),
      verifyContext(created.link.slug)
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.slug).toBe(created.link.slug);
    expect(payload.data.status).toBe("pending");
    expect(payload.data.transactionHash).toBeNull();
  });

  it("returns NOT_FOUND for unknown slugs", async () => {
    const response = await getLink(
      new NextRequest("http://localhost/api/links/NOEXISTE00"),
      verifyContext("NOEXISTE00")
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/links/[slug]/verify", () => {
  it("rejects verification on an expired link without network calls", async () => {
    const store = getLinkStore();
    const created = await createPaymentLink(store, {
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "3",
      title: "Expired",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    if (!created.ok) {
      throw new Error("setup failed");
    }
    const response = await verifyLink(
      postRequest(`/api/links/${created.link.slug}/verify`, {
        transactionHash: "f".repeat(64),
      }),
      verifyContext(created.link.slug)
    );
    expect(response.status).toBe(410);
    expect((await response.json()).error.code).toBe("EXPIRED");
  });

  it("rejects a transaction hash already used on another link", async () => {
    const store = getLinkStore();
    const first = await createPaymentLink(store, {
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "1",
      title: "First",
    });
    const second = await createPaymentLink(store, {
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "2",
      title: "Second",
    });
    if (!first.ok || !second.ok) {
      throw new Error("setup failed");
    }
    const hash = "e".repeat(64);
    const paid = await store.markPaid(
      first.link.slug,
      hash,
      "2026-09-02T00:00:00.000Z"
    );
    expect(paid.ok).toBe(true);

    const response = await verifyLink(
      postRequest(`/api/links/${second.link.slug}/verify`, {
        transactionHash: hash,
      }),
      verifyContext(second.link.slug)
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("HASH_ALREADY_USED");
  });

  it("returns the receipt idempotently for an already-paid link", async () => {
    const store = getLinkStore();
    const created = await createPaymentLink(store, {
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "1",
      title: "Paid",
    });
    if (!created.ok) {
      throw new Error("setup failed");
    }
    const hash = "d".repeat(64);
    await store.markPaid(created.link.slug, hash, "2026-09-02T00:00:00.000Z");

    const response = await verifyLink(
      postRequest(`/api/links/${created.link.slug}/verify`, {
        transactionHash: hash,
      }),
      verifyContext(created.link.slug)
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.verified).toBe(true);
    expect(payload.data.receipt.transactionHash).toBe(hash);
  });
});
