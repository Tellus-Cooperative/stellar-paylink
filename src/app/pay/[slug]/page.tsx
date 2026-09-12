import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PaylinkFooter from "@/components/paylink-footer";
import PaylinkTopbar from "@/components/paylink-topbar";
import { getLinkStore } from "@/lib/db/store";
import { deriveStatus } from "@/lib/links/service";
import { stellarNetworkConfig } from "@/lib/stellar/horizon";
import { slugSchema } from "@/lib/validation/link-schema";
import PayClient, { type PayLinkView } from "./pay-client";
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
  const title = `${record.title} — Pay with HareLink`;
  const description = `Pay ${record.amount} ${record.asset.type === "native" ? "XLM" : record.asset.code} to ${record.destination.slice(0, 6)}… via HareLink. One link. Direct settlement. Non-custodial on Stellar.`;
  const url = `/pay/${record.slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "HareLink",
      images: [{ url: "/harelink-verified.webp", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function PayLink({
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

  const link: PayLinkView = {
    slug: record.slug,
    destination: record.destination,
    asset: record.asset,
    amount: record.amount,
    memo: record.memo,
    title: record.title,
    description: record.description,
    status,
    expiresAt: record.expiresAt,
    transactionHash: status === "paid" ? record.transactionHash : null,
  };

  return (
    <div className="harelink">
      <div className="harelink__inner">
        <PaylinkTopbar pill={networkLabel} />

        <section className="harelink__hero">
          <p className="harelink__eyebrow">HARELINK / TELLUS COOPERATIVE</p>
          <h1 className="harelink__title">
            Pay this HareLink.
          </h1>
          <p className="harelink__lede">
            Review the request, then approve it from your own Stellar wallet.
            Funds settle directly to the receiving address — HareLink never
            takes custody.
          </p>
        </section>

        <PayClient
          link={link}
          horizonUrl={network.horizonUrl}
          networkPassphrase={network.passphrase}
          networkLabel={networkLabel}
          explorerBaseUrl={`https://stellar.expert/explorer/${network.network}/tx`}
        />

        <section className="harelink__strip" aria-label="How it works">
          <span className="harelink__strip-item">
            <span className="harelink__strip-dot" aria-hidden />
            Sign in your wallet
          </span>
          <span className="harelink__strip-item">
            <span className="harelink__strip-dot" aria-hidden />
            Funds settle to the receiver
          </span>
          <span className="harelink__strip-item">
            <span className="harelink__strip-dot" aria-hidden />
            Verified on-chain on Stellar
          </span>
        </section>
      </div>

      {/* Outside harelink__inner: the footer spans the full width and applies
          its own container, the same way index.html lays it out. */}
      <PaylinkFooter />
    </div>
  );
}
