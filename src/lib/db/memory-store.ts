import type {
  LinkStore,
  MarkPaidResult,
  NewLinkRecord,
  PaymentLinkRecord,
} from "@/lib/db/types";

export class InMemoryLinkStore implements LinkStore {
  private bySlug = new Map<string, PaymentLinkRecord>();
  private byMemo = new Map<string, PaymentLinkRecord>();
  private byTransactionHash = new Map<string, PaymentLinkRecord>();

  async create(record: NewLinkRecord): Promise<PaymentLinkRecord> {
    const link: PaymentLinkRecord = {
      ...record,
      status: "pending",
      transactionHash: null,
      paidAt: null,
    };
    this.bySlug.set(link.slug, link);
    this.byMemo.set(link.memo, link);
    return link;
  }

  async findBySlug(slug: string): Promise<PaymentLinkRecord | null> {
    return this.bySlug.get(slug) ?? null;
  }

  async findByMemo(memo: string): Promise<PaymentLinkRecord | null> {
    return this.byMemo.get(memo) ?? null;
  }

  async findByTransactionHash(
    transactionHash: string
  ): Promise<PaymentLinkRecord | null> {
    return this.byTransactionHash.get(transactionHash) ?? null;
  }

  async markPaid(
    slug: string,
    transactionHash: string,
    paidAt: string
  ): Promise<MarkPaidResult> {
    const link = this.bySlug.get(slug);
    if (!link) {
      return { ok: false, code: "NOT_FOUND" };
    }
    if (link.status === "paid") {
      return { ok: false, code: "ALREADY_PAID" };
    }
    if (link.status === "expired") {
      return { ok: false, code: "EXPIRED" };
    }
    const owner = this.byTransactionHash.get(transactionHash);
    if (owner && owner.slug !== slug) {
      return { ok: false, code: "ALREADY_PAID" };
    }
    link.status = "paid";
    link.transactionHash = transactionHash;
    link.paidAt = paidAt;
    this.byTransactionHash.set(transactionHash, link);
    return { ok: true, link };
  }

  snapshot(): PaymentLinkRecord[] {
    return [...this.bySlug.values()];
  }
}