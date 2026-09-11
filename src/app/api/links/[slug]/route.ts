import type { NextRequest } from "next/server";

import { getLinkStore } from "@/lib/db/store";
import { deriveStatus } from "@/lib/links/service";
import { slugSchema } from "@/lib/validation/link-schema";
import { jsonError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const slugResult = slugSchema.safeParse(slug);
  if (!slugResult.success) {
    return jsonError("VALIDATION_ERROR", "Invalid slug", 422);
  }

  const store = getLinkStore();
  const link = await store.findBySlug(slugResult.data);
  if (!link) {
    return jsonError("NOT_FOUND", "Link not found", 404);
  }

  const status = deriveStatus(link);
  return jsonOk({
    slug: link.slug,
    destination: link.destination,
    asset: link.asset,
    amount: link.amount,
    memo: link.memo,
    title: link.title,
    description: link.description,
    status,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    transactionHash: status === "paid" ? link.transactionHash : null,
  });
}