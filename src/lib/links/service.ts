import { randomBytes, randomUUID } from "node:crypto";

import type { LinkStore, NewLinkRecord } from "@/lib/db/types";
import { publicLinkView, type PaymentLinkRecord } from "@/lib/db/types";
import { config, STELLAR_TESTNET_PASSPHRASE } from "@/lib/config/env";
import { generateMemoReference } from "@/lib/stellar/memo";
import { parseAmount } from "@/lib/payments/amount";
import type { SupportedAsset } from "@/lib/stellar/assets";

export interface CreatePaymentLinkInput {
  destination: string;
  asset: SupportedAsset;
  amount: string;
  title: string;
  description?: string | null;
  expiresAt?: string | null;
}

export type CreateLinkResult =
  | {
      ok: true;
      link: PaymentLinkRecord;
      paymentUrl: string;
    }
  | {
      ok: false;
      code:
        | "AMOUNT_INVALID"
        | "INVALID_DESTINATION"
        | "UNSUPPORTED_ASSET"
        | "MEMO_COLLISION";
    };

const SLUG_LENGTH = 12;

function generateSlugTwelve(): string {
  const slug = randomBytes(9)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, SLUG_LENGTH);
  return slug.padEnd(SLUG_LENGTH, "x");
}

export function appUrl(): string {
  return config().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export function paymentUrl(slug: string): string {
  return `${appUrl()}/pay/${slug}`;
}

export async function createPaymentLink(
  store: LinkStore,
  input: CreatePaymentLinkInput
): Promise<CreateLinkResult> {
  const parsedAmount = parseAmount(input.amount);
  if (!parsedAmount.ok) {
    return { ok: false, code: "AMOUNT_INVALID" };
  }

  let memo: string | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = generateMemoReference();
    const existing = await store.findByMemo(candidate);
    if (!existing) {
      memo = candidate;
      break;
    }
  }
  if (!memo) {
    return { ok: false, code: "MEMO_COLLISION" };
  }

  const now = new Date();
  const record: NewLinkRecord = {
    id: randomUUID(),
    slug: generateSlugTwelve(),
    destination: input.destination,
    network: "testnet",
    asset: input.asset,
    amount: parsedAmount.normalized,
    memo,
    title: input.title,
    description: input.description ?? null,
    expiresAt: input.expiresAt ?? null,
    createdAt: now.toISOString(),
  };

  const link = await store.create(record);
  return { ok: true, link, paymentUrl: paymentUrl(link.slug) };
}

export function deriveStatus(
  link: PaymentLinkRecord,
  now: Date = new Date()
): PaymentLinkRecord["status"] {
  if (link.status === "paid") {
    return "paid";
  }
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return "pending";
}

export function publicPayload(link: PaymentLinkRecord) {
  const status = deriveStatus(link);
  return {
    ...publicLinkView(link),
    status,
    paymentUrl: paymentUrl(link.slug),
  };
}

export const TESTNET_PASSPHRASE = STELLAR_TESTNET_PASSPHRASE;