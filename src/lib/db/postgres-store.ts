import { Pool, type PoolClient } from "pg";

import type {
  AssetRequest,
  LinkStatus,
  LinkStore,
  MarkPaidResult,
  NewLinkRecord,
  PaymentLinkRecord,
} from "@/lib/db/types";

interface PaymentLinkRow {
  id: string;
  slug: string;
  destination: string;
  network: string;
  asset_type: string;
  asset_code: string | null;
  asset_issuer: string | null;
  amount: string;
  memo: string;
  title: string;
  description: string | null;
  status: string;
  expires_at: Date | null;
  transaction_hash: string | null;
  created_at: Date;
  paid_at: Date | null;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function rowToRecord(row: PaymentLinkRow): PaymentLinkRecord {
  const asset: AssetRequest =
    row.asset_type === "credit_alphanum"
      ? {
          type: "credit_alphanum",
          code: row.asset_code ?? "",
          issuer: row.asset_issuer ?? "",
        }
      : { type: "native" };
  return {
    id: row.id,
    slug: row.slug,
    destination: row.destination,
    network: row.network,
    asset,
    amount: row.amount,
    memo: row.memo,
    title: row.title,
    description: row.description,
    status: row.status as LinkStatus,
    expiresAt: toIso(row.expires_at),
    transactionHash: row.transaction_hash,
    createdAt: row.created_at.toISOString(),
    paidAt: toIso(row.paid_at),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export class PostgresLinkStore implements LinkStore {
  private pool: Pool;

  constructor(pool?: Pool, connectionString?: string) {
    this.pool =
      pool ?? new Pool({ connectionString, max: 5, idleTimeoutMillis: 30000 });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async create(record: NewLinkRecord): Promise<PaymentLinkRecord> {
    const assetCode =
      record.asset.type === "credit_alphanum" ? record.asset.code : null;
    const assetIssuer =
      record.asset.type === "credit_alphanum" ? record.asset.issuer : null;
    const result = await this.pool.query<PaymentLinkRow>(
      `INSERT INTO payment_links
        (id, slug, destination, network, asset_type, asset_code, asset_issuer,
         amount, memo, title, description, status, expires_at,
         transaction_hash, created_at, paid_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         'pending', $12, NULL, $13, NULL)
       RETURNING *`,
      [
        record.id,
        record.slug,
        record.destination,
        record.network,
        record.asset.type,
        assetCode,
        assetIssuer,
        record.amount,
        record.memo,
        record.title,
        record.description,
        record.expiresAt,
        record.createdAt,
      ]
    );
    return rowToRecord(result.rows[0]);
  }

  async findBySlug(slug: string): Promise<PaymentLinkRecord | null> {
    const result = await this.pool.query<PaymentLinkRow>(
      "SELECT * FROM payment_links WHERE slug = $1",
      [slug]
    );
    return result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
  }

  async findByMemo(memo: string): Promise<PaymentLinkRecord | null> {
    const result = await this.pool.query<PaymentLinkRow>(
      "SELECT * FROM payment_links WHERE memo = $1",
      [memo]
    );
    return result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
  }

  async findByTransactionHash(
    transactionHash: string
  ): Promise<PaymentLinkRecord | null> {
    const result = await this.pool.query<PaymentLinkRow>(
      "SELECT * FROM payment_links WHERE transaction_hash = $1",
      [transactionHash]
    );
    return result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
  }

  async markPaid(
    slug: string,
    transactionHash: string,
    paidAt: string
  ): Promise<MarkPaidResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await findBySlugTx(client, slug);
      if (!current) {
        await client.query("ROLLBACK");
        return { ok: false, code: "NOT_FOUND" };
      }
      if (current.status === "paid") {
        await client.query("ROLLBACK");
        return { ok: false, code: "ALREADY_PAID" };
      }
      if (current.status === "expired") {
        await client.query("ROLLBACK");
        return { ok: false, code: "EXPIRED" };
      }
      const owner = await findByTransactionHashTx(client, transactionHash);
      if (owner && owner.slug !== slug) {
        await client.query("ROLLBACK");
        return { ok: false, code: "ALREADY_PAID" };
      }
      let updated: PaymentLinkRecord | null = null;
      try {
        const result = await client.query<PaymentLinkRow>(
          `UPDATE payment_links
           SET status = 'paid', transaction_hash = $2, paid_at = $3
           WHERE slug = $1 AND status = 'pending'
           RETURNING *`,
          [slug, transactionHash, paidAt]
        );
        updated = result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
      } catch (error) {
        if (isUniqueViolation(error)) {
          await client.query("ROLLBACK");
          return { ok: false, code: "ALREADY_PAID" };
        }
        throw error;
      }
      if (!updated) {
        const reread = await findBySlugTx(client, slug);
        await client.query("ROLLBACK");
        if (!reread) {
          return { ok: false, code: "NOT_FOUND" };
        }
        if (reread.status === "expired") {
          return { ok: false, code: "EXPIRED" };
        }
        return { ok: false, code: "ALREADY_PAID" };
      }
      await client.query("COMMIT");
      return { ok: true, link: updated };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

async function findBySlugTx(
  client: PoolClient,
  slug: string
): Promise<PaymentLinkRecord | null> {
  const result = await client.query<PaymentLinkRow>(
    "SELECT * FROM payment_links WHERE slug = $1 FOR UPDATE",
    [slug]
  );
  return result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
}

async function findByTransactionHashTx(
  client: PoolClient,
  transactionHash: string
): Promise<PaymentLinkRecord | null> {
  const result = await client.query<PaymentLinkRow>(
    "SELECT * FROM payment_links WHERE transaction_hash = $1",
    [transactionHash]
  );
  return result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
}
