export const LINK_STATUSES = ["pending", "paid", "expired"] as const;

export type LinkStatus = (typeof LINK_STATUSES)[number];

export type AssetRequest =
  | { type: "native" }
  | { type: "credit_alphanum"; code: string; issuer: string };

export interface NewLinkRecord {
  id: string;
  slug: string;
  destination: string;
  network: string;
  asset: AssetRequest;
  amount: string;
  memo: string;
  title: string;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PaymentLinkRecord extends NewLinkRecord {
  status: LinkStatus;
  transactionHash: string | null;
  paidAt: string | null;
}

export type MarkPaidResult =
  | { ok: true; link: PaymentLinkRecord }
  | { ok: false; code: "NOT_FOUND" | "ALREADY_PAID" | "EXPIRED" };

export interface LinkStore {
  create(record: NewLinkRecord): Promise<PaymentLinkRecord>;
  findBySlug(slug: string): Promise<PaymentLinkRecord | null>;
  findByMemo(memo: string): Promise<PaymentLinkRecord | null>;
  findByTransactionHash(
    transactionHash: string
  ): Promise<PaymentLinkRecord | null>;
  markPaid(slug: string, transactionHash: string, paidAt: string): Promise<MarkPaidResult>;
}

export function publicLinkView(link: PaymentLinkRecord): {
  slug: string;
  destination: string;
  asset: AssetRequest;
  amount: string;
  memo: string;
  title: string;
  description: string | null;
  status: LinkStatus;
  expiresAt: string | null;
  createdAt: string;
  transactionHash: string | null;
} {
  return {
    slug: link.slug,
    destination: link.destination,
    asset: link.asset,
    amount: link.amount,
    memo: link.memo,
    title: link.title,
    description: link.description,
    status: link.status,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    transactionHash: link.transactionHash,
  };
}