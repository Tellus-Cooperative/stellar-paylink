import { notFound } from "next/navigation";

import PaylinkFooter from "@/components/paylink-footer";
import PaylinkTopbar from "@/components/paylink-topbar";
import { getLinkStore } from "@/lib/db/store";
import { deriveStatus } from "@/lib/links/service";
import { stellarNetworkConfig } from "@/lib/stellar/horizon";
import { slugSchema } from "@/lib/validation/link-schema";
import PayClient, { type PayLinkView } from "./pay-client";
import "../../paylink.css";

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
    <div className="paylink">
      <div className="paylink__inner">
        <PaylinkTopbar pill={networkLabel} />

        <section className="paylink__hero">
          <p className="paylink__eyebrow">Paylink | Tellus Cooperative</p>
          <h1 className="paylink__title">
            Pay this <span>Paylink.</span>
          </h1>
          <p className="paylink__lede">
            Review what is being requested, then sign it in your own wallet.
            Stellar confirms the payment and the link flips to verified.
          </p>
        </section>

        <PayClient
          link={link}
          horizonUrl={network.horizonUrl}
          networkPassphrase={network.passphrase}
          networkLabel={networkLabel}
          explorerBaseUrl={`https://stellar.expert/explorer/${network.network}/tx`}
        />

        <section className="paylink__strip" aria-label="How it works">
          <span className="paylink__strip-item">
            <span className="paylink__strip-dot" aria-hidden />
            Sign in your wallet
          </span>
          <span className="paylink__strip-item">
            <span className="paylink__strip-dot" aria-hidden />
            Funds settle to the receiver
          </span>
          <span className="paylink__strip-item">
            <span className="paylink__strip-dot" aria-hidden />
            Verified on-chain on Stellar
          </span>
        </section>
      </div>

      {/* Outside paylink__inner: the footer spans the full width and applies
          its own container, the same way index.html lays it out. */}
      <PaylinkFooter />
    </div>
  );
}
