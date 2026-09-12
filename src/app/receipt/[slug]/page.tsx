import type { Metadata } from "next";
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
import "../../harelink.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return {};
  const record = await getLinkStore().findBySlug(parsed.data);
  if (!record) return {};
  const status = deriveStatus(record);
  const title =
    status === "paid"
      ? `Receipt — ${record.title} | HareLink`
      : `${record.title} | HareLink`;
  const description =
    status === "paid"
      ? `Verified on Stellar: ${record.amount} ${record.asset.type === "native" ? "XLM" : record.asset.code} settled to ${record.destination.slice(0, 6)}…`
      : `HareLink receipt — One link. Direct settlement.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/receipt/${record.slug}`,
      siteName: "HareLink",
      images: [{ url: "/harelink-verified.webp", width: 1200, height: 630, alt: title }],
    },
  };
}

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
    <div className="harelink">
      <div className="harelink__inner">
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
          <section className="harelink__builder" aria-label="Receipt unavailable">
            <div className="harelink__panel harelink__panel--form">
              <p className="harelink__preview-eyebrow">Receipt</p>
              <h2 className="harelink__result-title">
                {status === "expired"
                  ? "This link expired"
                  : "No verified payment yet"}
              </h2>
              <p className="harelink__lede">
                {status === "expired"
                  ? "The payment window closed before any matching transaction settled."
                  : "A receipt appears here once the network confirms the payment."}
              </p>
              <div className="harelink__result-actions">
                <Link className="harelink__primary" href={`/pay/${record.slug}`}>
                  {status === "expired" ? "View link" : "Pay this link"}{" "}
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      <PaylinkFooter />
    </div>
  );
}
