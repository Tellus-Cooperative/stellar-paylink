import PaylinkFooter from "@/components/paylink-footer";
import PaylinkTopbar from "@/components/paylink-topbar";
import { DarkGradientBg } from "@/components/ui/elegant-dark-pattern";
import { makeAssetAllowlist } from "@/lib/validation/link-schema";
import { stellarNetworkConfig } from "@/lib/stellar/horizon";
import CreateForm from "./create-form";
import "../harelink.css";

export const dynamic = "force-dynamic";

export default function CreateLink() {
  const network = stellarNetworkConfig();
  const assets = makeAssetAllowlist();
  const networkLabel =
    network.network.charAt(0).toUpperCase() + network.network.slice(1);

  return (
    <DarkGradientBg className="harelink">
      <div className="harelink__inner">
        <PaylinkTopbar pill={networkLabel} />

        <section className="harelink__hero">
          <div className="harelink__hero-copy">
            <p className="harelink__eyebrow">HARELINK / TELLUS COOPERATIVE</p>
            <h1 className="harelink__title">
              Create a payment link.
            </h1>
            <p className="harelink__lede">
              Set the payment details once, share the link anywhere, and let
              anyone approve it from their own Stellar wallet. Funds settle
              directly to the receiving address.
            </p>
            <p className="harelink__field-hint" style={{ marginTop: 10 }}>
              One link. Direct settlement. — HareLink never takes custody.
            </p>
          </div>
        </section>

        <CreateForm
          assets={assets}
          networkPassphrase={network.passphrase}
          networkLabel={networkLabel}
        />

      </div>

      {/* Outside harelink__inner: the footer spans the full width and applies
          its own container, the same way index.html lays it out. */}
      <PaylinkFooter />
    </DarkGradientBg>
  );
}
