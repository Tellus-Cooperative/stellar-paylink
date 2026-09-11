import PaylinkFooter from "@/components/paylink-footer";
import PaylinkTopbar from "@/components/paylink-topbar";
import { DarkGradientBg } from "@/components/ui/elegant-dark-pattern";
import { makeAssetAllowlist } from "@/lib/validation/link-schema";
import { stellarNetworkConfig } from "@/lib/stellar/horizon";
import CreateForm from "./create-form";
import "../paylink.css";

export const dynamic = "force-dynamic";

export default function CreateLink() {
  const network = stellarNetworkConfig();
  const assets = makeAssetAllowlist();
  const networkLabel =
    network.network.charAt(0).toUpperCase() + network.network.slice(1);

  return (
    <DarkGradientBg className="paylink">
      <div className="paylink__inner">
        <PaylinkTopbar pill={networkLabel} />

        <section className="paylink__hero">
          <div className="paylink__hero-copy">
            <p className="paylink__eyebrow">PAYLINK / TELLUS COOPERATIVE</p>
            <h1 className="paylink__title">
              Create a <span>Paylink.</span>
            </h1>
            <p className="paylink__lede">
              Set the terms once, then share a payment request anyone can sign
              from their own Stellar wallet.
            </p>
          </div>
        </section>

        <CreateForm
          assets={assets}
          networkPassphrase={network.passphrase}
          networkLabel={networkLabel}
        />

      </div>

      {/* Outside paylink__inner: the footer spans the full width and applies
          its own container, the same way index.html lays it out. */}
      <PaylinkFooter />
    </DarkGradientBg>
  );
}
