import type { NextRequest } from "next/server";

import { getLinkStore } from "@/lib/db/store";
import {
  createHorizonClient,
  explorerTransactionUrl,
  stellarNetworkConfig,
} from "@/lib/stellar/horizon";
import { deriveStatus } from "@/lib/links/service";
import {
  buildReceipt,
  evaluateVerification,
  mapTransactionDetails,
} from "@/lib/links/verification";
import {
  slugSchema,
  transactionHashSchema,
} from "@/lib/validation/link-schema";
import {
  VERIFY_LINK_LIMIT,
  checkRateLimit,
  clientIp,
} from "@/lib/api/rate-limit";
import { jsonError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const limited = checkRateLimit(
    `verify:${clientIp(request)}`,
    VERIFY_LINK_LIMIT
  );
  if (!limited.ok) {
    const response = jsonError(
      "RATE_LIMITED",
      "Too many verification requests",
      429,
      { retryAfterSeconds: limited.retryAfterSeconds }
    );
    response.headers.set("Retry-After", String(limited.retryAfterSeconds));
    return response;
  }

  const { slug } = await context.params;
  const slugResult = slugSchema.safeParse(slug);
  if (!slugResult.success) {
    return jsonError("VALIDATION_ERROR", "Invalid slug", 422);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }
  const parsed = transactionHashSchema.safeParse(
    (body as { transactionHash?: unknown }).transactionHash
  );
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      "transactionHash must be a 64-character hex string",
      422
    );
  }
  const transactionHash = parsed.data.toLowerCase();

  const store = getLinkStore();
  const link = await store.findBySlug(slugResult.data);
  if (!link) {
    return jsonError("NOT_FOUND", "Link not found", 404);
  }

  const status = deriveStatus(link);
  if (status === "paid") {
    if (link.transactionHash === transactionHash) {
      return jsonOk({
        verified: true,
        receipt: buildReceipt(
          link,
          explorerTransactionUrl(stellarNetworkConfig().network, transactionHash)
        ),
      });
    }
    return jsonError(
      "ALREADY_PAID",
      "Link already paid with a different transaction",
      409
    );
  }
  if (status === "expired") {
    return jsonError("EXPIRED", "Link has expired", 410);
  }

  const existing = await store.findByTransactionHash(transactionHash);
  if (existing && existing.slug !== link.slug) {
    return jsonError(
      "HASH_ALREADY_USED",
      "Transaction already used on another link",
      409
    );
  }

  const server = createHorizonClient();
  let tx;
  try {
    tx = await server.transactions().transaction(transactionHash).call();
  } catch {
    return jsonError("TRANSACTION_NOT_FOUND", "Transaction not found", 404);
  }

  const ops = (await server.payments().forTransaction(transactionHash).call())
    .records;
  const paymentOps = ops.filter(
    (op): op is import("@stellar/stellar-sdk").Horizon.ServerApi.PaymentOperationRecord =>
      op.type === "payment"
  );

  const details = mapTransactionDetails(tx, paymentOps);

  const verdict = evaluateVerification(link, details, new Date());
  if (!verdict.ok) {
    return jsonError(
      verdict.code === "TRANSACTION_FAILED"
        ? "TRANSACTION_INVALID"
        : verdict.code,
      "Transaction verification failed",
      409,
      { reason: verdict.code }
    );
  }

  const markPaid = await store.markPaid(
    link.slug,
    transactionHash,
    new Date().toISOString()
  );
  if (!markPaid.ok) {
    if (markPaid.code === "EXPIRED") {
      return jsonError("EXPIRED", "Link has expired", 410);
    }
    return jsonError(
      "ALREADY_PAID",
      "Link already paid",
      409
    );
  }

  return jsonOk({
    verified: true,
    receipt: buildReceipt(
      markPaid.link,
      explorerTransactionUrl(stellarNetworkConfig().network, transactionHash)
    ),
  });
}