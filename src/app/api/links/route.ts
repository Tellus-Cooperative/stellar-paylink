import type { NextRequest } from "next/server";

import { getLinkStore } from "@/lib/db/store";
import { checkDestinationReadiness } from "@/lib/stellar/readiness";
import { createHorizonClient } from "@/lib/stellar/horizon";
import { createPaymentLink } from "@/lib/links/service";
import { createLinkRequestSchema } from "@/lib/validation/link-schema";
import {
  CREATE_LINK_LIMIT,
  checkRateLimit,
  clientIp,
} from "@/lib/api/rate-limit";
import { jsonError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(
    `create:${clientIp(request)}`,
    CREATE_LINK_LIMIT
  );
  if (!limited.ok) {
    const response = jsonError(
      "RATE_LIMITED",
      "Too many link creation requests",
      429,
      { retryAfterSeconds: limited.retryAfterSeconds }
    );
    response.headers.set("Retry-After", String(limited.retryAfterSeconds));
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = createLinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      "Invalid link request",
      422,
      { issues: parsed.error.issues }
    );
  }

  const server = createHorizonClient();
  const readiness = await checkDestinationReadiness(
    server,
    parsed.data.destination,
    parsed.data.asset
  );
  if (
    readiness.accountExists &&
    parsed.data.asset.type === "credit_alphanum" &&
    !readiness.hasTrustline
  ) {
    return jsonError(
      "DESTINATION_NOT_READY",
      "Destination account does not trust the requested asset",
      422
    );
  }

  const store = getLinkStore();
  const result = await createPaymentLink(store, parsed.data);
  if (!result.ok) {
    if (result.code === "AMOUNT_INVALID") {
      return jsonError("AMOUNT_INVALID", "Invalid or out-of-bounds amount", 422);
    }
    if (result.code === "UNSUPPORTED_ASSET") {
      return jsonError("UNSUPPORTED_ASSET", "Asset not supported", 422);
    }
    return jsonError("INTERNAL_ERROR", "Unable to create link", 500);
  }

  return jsonOk(
    {
      link: {
        slug: result.link.slug,
        destination: result.link.destination,
        asset: result.link.asset,
        amount: result.link.amount,
        memo: result.link.memo,
        title: result.link.title,
        description: result.link.description,
        status: result.link.status,
        expiresAt: result.link.expiresAt,
        createdAt: result.link.createdAt,
      },
      paymentUrl: result.paymentUrl,
      readiness,
      network: "testnet",
    },
    201
  );
}