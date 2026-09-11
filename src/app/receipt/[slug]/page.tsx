import Link from "next/link";
import { notFound } from "next/navigation";

import PaylinkFooter from "@/components/paylink-footer";
import PaylinkTopbar from "@/components/paylink-topbar";
import ReceiptView from "@/components/receipt-view";
import { getLinkStore } from "@/lib/db/store";
import { deriveStatus } from "@/lib/links/service";
import { buildReceipt } from "@/lib/links/verification";
import {
  explorerTransactionUrl,
  stellarNetworkConfig,
} from "@/lib/stellar/horizon";
import { slugSchema } from "@/lib/validation/link-schema";
import "../../paylink.css";

export const dynamic = "force-dynamic";

export default async function Receipt({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    notFound();
  }

  const record = await getLinkStore().findBySlug(parsed.data);
  if (!record) {
    notFound();
  }

  const network = stellarNetworkConfig();
  const networkLabel =
    network.network.charAt(0).toUpperCase() + network.network.slice(1);
  const status = deriveStatus(record);

  return (
    <div className="paylink">
      <div className="paylink__inner">
        <PaylinkTopbar pill={networkLabel} />

        {status === "paid" && record.transactionHash ? (
          <ReceiptView
            title={record.title}
            destination={record.destination}
            networkLabel={networkLabel}
            receipt={buildReceipt(
              record,
              explorerTransactionUrl(network.network, record.transactionHash)
            )}
          />
        ) : (
          <section className="paylink__builder" aria-label="Receipt unavailable">
            <div className="paylink__panel paylink__panel--form">
              <p className="paylink__preview-eyebrow">Receipt</p>
              <h2 className="paylink__result-title">
                {status === "expired"
                  ? "This link expired"
                  : "No verified payment yet"}
              </h2>
              <p className="paylink__lede">
                {status === "expired"
                  ? "The payment window closed before any matching transaction settled."
                  : "A receipt appears here once the network confirms the payment."}
              </p>
              <div className="paylink__result-actions">
                <Link className="paylink__primary" href={`/pay/${record.slug}`}>
                  {status === "expired" ? "View link" : "Pay this link"}{" "}
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        <PaylinkFooter />
      </div>
    </div>
  );
}
