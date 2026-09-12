"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toPng } from "html-to-image";

import { ShinyButton } from "@/components/ui/shiny-button";
import ShareCard from "@/components/ui/harelink-share-card";
import HareArt from "@/components/ui/harelink-hare-art";



// Carga diferida: evita que react-qr-code entre al chunk inicial del formulario.
// Se desactiva SSR porque el QR solo se renderiza tras crear el enlace.
const QRCode = dynamic(
  () => import("react-qr-code").then((m) => m.QRCode as unknown as React.ComponentType<Record<string, unknown>>),
  { ssr: false }
) as unknown as React.ComponentType<{
  value: string;
  size?: number;
  role?: string;
  "aria-label"?: string;
}>;

// Iconos de 18px, trazo de 1.6: acompañan a las acciones secundarias sin
// competir con el texto. Decorativos — cada control lleva su propia etiqueta.
const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

function ShareIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.4 10.8 15.6 6.6M8.4 13.2l7.2 4.2" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="7" height="7" rx="1.4" />
      <rect x="14" y="3" width="7" height="7" rx="1.4" />
      <rect x="3" y="14" width="7" height="7" rx="1.4" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 18v3" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 6.5 15" />
    </svg>
  );
}

import {
  FREIGHTER_INSTALL_URL,
  WalletError,
  assertNetwork,
  connectWallet,
} from "@/lib/wallet/freighter";
import { parseAmount } from "@/lib/payments/amount";
import type { SupportedAsset } from "@/lib/stellar/assets";

export interface CreateFormProps {
  assets: SupportedAsset[];
  networkPassphrase: string;
  networkLabel: string;
}

interface CreatedLink {
  slug: string;
  memo: string;
  amount: string;
  assetLabel: string;
  destination: string;
  title: string;
  paymentUrl: string;
}

type Expiry = "never" | "1h" | "24h" | "7d";

const EXPIRY_OPTIONS: { value: Expiry; label: string }[] = [
  { value: "never", label: "No expiry" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
];

const EXPIRY_MS: Record<Exclude<Expiry, "never">, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

function assetLabel(asset: SupportedAsset): string {
  return asset.type === "native" ? "XLM" : asset.code;
}

function assetKey(asset: SupportedAsset): string {
  return asset.type === "native" ? "native" : `${asset.code}:${asset.issuer}`;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function expiresAtIso(expiry: Expiry): string | null {
  if (expiry === "never") return null;
  return new Date(Date.now() + EXPIRY_MS[expiry]).toISOString();
}

const API_ERROR_COPY: Record<string, string> = {
  VALIDATION_ERROR: "Some fields are not valid. Check them and try again.",
  AMOUNT_INVALID: "That amount is out of the supported range.",
  UNSUPPORTED_ASSET: "That asset is not enabled on this deployment.",
  DESTINATION_NOT_READY:
    "The destination account does not trust that asset yet. Add a trustline first.",
  INTERNAL_ERROR: "The link could not be created. Try again in a moment.",
};

export default function CreateForm({
  assets,
  networkPassphrase,
  networkLabel,
}: CreateFormProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState<Expiry>("never");
  const [selectedAssetKey, setSelectedAssetKey] = useState(
    assetKey(assets[0])
  );

  const [submitting, setSubmitting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);
  const [exporting, setExporting] = useState<"qr" | "card" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cardImage, setCardImage] = useState<{ dataUrl: string } | null>(null);

  const shareCardRef = useRef<HTMLDivElement>(null);

  const selectedAsset =
    assets.find((asset) => assetKey(asset) === selectedAssetKey) ?? assets[0];

  const canSubmit = useMemo(
    () =>
      title.trim().length > 0 &&
      parseAmount(amount).ok &&
      destination.trim().length > 0 &&
      !submitting,
    [title, amount, destination, submitting]
  );

  async function useWalletAddress() {
    setConnecting(true);
    setError(null);
    try {
      const connection = await connectWallet();
      assertNetwork(connection, networkPassphrase);
      setDestination(connection.address);
    } catch (caught) {
      if (caught instanceof WalletError && caught.code === "NOT_INSTALLED") {
        setError(
          `Freighter was not detected. Install it at ${FREIGHTER_INSTALL_URL} and reload.`
        );
      } else {
        setError(
          caught instanceof Error ? caught.message : "Could not reach Freighter."
        );
      }
    } finally {
      setConnecting(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          asset: selectedAsset,
          amount,
          title: title.trim(),
          description: description.trim() || null,
          expiresAt: expiresAtIso(expiry),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const code: string = payload?.error?.code ?? "INTERNAL_ERROR";
        setError(API_ERROR_COPY[code] ?? "The link could not be created.");
        return;
      }

      const link = payload.data.link;
      setCreated({
        slug: link.slug,
        memo: link.memo,
        amount: link.amount,
        assetLabel: assetLabel(link.asset),
        destination: link.destination,
        title: link.title,
        paymentUrl: payload.data.paymentUrl,
      });
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function shareMessage(): string {
    if (!created) return "";
    return `HareLink — One link. Direct settlement.\n${created.title}: ${created.amount} ${created.assetLabel} → ${created.paymentUrl}`;
  }

  async function copyPaymentLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.paymentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard is blocked. Copy the link manually.");
    }
  }

  async function copyMemo() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.memo);
      setMemoCopied(true);
      window.setTimeout(() => setMemoCopied(false), 2000);
    } catch {
      setError("Clipboard is blocked. Copy the memo manually.");
    }
  }

  function reset() {
    setCreated(null);
    setTitle("");
    setAmount("");
    setDescription("");
    setExpiry("never");
    setCopied(false);
    setMemoCopied(false);
    setMenuOpen(false);
    setCardImage(null);
  }

  async function downloadQr() {
    if (!created || !shareCardRef.current) return;
    const node = shareCardRef.current.querySelector<HTMLElement>(
      "[data-export-qr]"
    );
    if (!node) return;
    setExporting("qr");
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `harelink-qr-${created.slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Could not generate the QR image. Try again.");
    } finally {
      setExporting(null);
    }
  }

  async function renderShareCard(): Promise<string | null> {
    if (!created || !shareCardRef.current) return null;
    try {
      return await toPng(shareCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#161616",
      });
    } catch {
      setError("Could not generate the share card. Try again.");
      return null;
    }
  }

  // Convierte un dataUrl a blob y File sin fetch (CSP bloquea fetch con data: URIs).
  function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/png";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  async function shareMenu() {
    if (!created || exporting !== null) return;
    setExporting("card");
    const dataUrl = await renderShareCard();
    if (dataUrl) {
      setCardImage({ dataUrl });
      setMenuOpen(true);
    }
    setExporting(null);
  }

  async function shareViaSystem() {
    if (!created) return;
    const image = cardImage ?? { dataUrl: (await renderShareCard()) ?? "" };
    const file = dataUrlToFile(
      image.dataUrl,
      `harelink-pay-${created.slug}.png`
    );

    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: `HareLink: ${created.title}`,
        text: shareMessage(),
      });
      setMenuOpen(false);
      return;
    }

    // Sin share nativo: descargar la imagen para adjuntarla manualmente.
    downloadDataUrl(image.dataUrl, `harelink-pay-${created.slug}.png`);
    setMenuOpen(false);
  }

  function saveCardImage() {
    if (!created || !cardImage) return;
    downloadDataUrl(cardImage.dataUrl, `harelink-pay-${created.slug}.png`);
    setMenuOpen(false);
  }

  function shareOnX() {
    if (!created) return;
    const message = shareMessage();
    const url =
      "https://x.com/intent/post?text=" +
      encodeURIComponent(message + "\nvia HareLink") +
      "&url=" +
      encodeURIComponent(created.paymentUrl);
    window.open(url, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

  function shareOnWhatsApp() {
    if (!created) return;
    const message = shareMessage();
    const url =
      "https://wa.me/?text=" +
      encodeURIComponent(message + "\n" + created.paymentUrl);
    window.open(url, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

  function closeShareMenu() {
    setMenuOpen(false);
  }

  if (created) {
    return (
      <>
        <section className="hlready__hero">
          <p className="harelink__eyebrow">HARELINK / TELLUS COOPERATIVE</p>
          <h1 className="hlready__title">
            Your payment link is <span>ready.</span>
          </h1>
          <p className="hlready__lede">
            Share the link or QR code. The payer signs from their own Stellar
            wallet, and funds settle directly to the receiving address.
          </p>
        </section>

        <section className="hlready" aria-label="Payment link created">
          <div className="hlready__panel">
            <div className="hlready__left">
              <p className="hlready__eyebrow">Link ready</p>

              <div className="hlready__amount-row">
                <p className="hlready__amount">
                  {created.amount} <span>{created.assetLabel}</span>
                </p>
                <span className="hlready__amount-rule" aria-hidden />
                <p className="hlready__request">{created.title}</p>
              </div>

              <label className="hlready__label" htmlFor="harelink-payment-url">
                Payment link
              </label>
              <div className="hlready__linkfield">
                <input
                  id="harelink-payment-url"
                  className="hlready__linkfield-input"
                  value={created.paymentUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  className="hlready__icon-button"
                  type="button"
                  onClick={copyPaymentLink}
                  aria-label="Copy payment link"
                >
                  <CopyIcon />
                </button>
              </div>

              <button
                className="hlready__cta"
                type="button"
                onClick={copyPaymentLink}
              >
                {copied ? "Copied" : "Copy payment link"}
              </button>

              <div className="hlready__actions">
                <div className="hlready__share">
                  <button
                    className="hlready__action"
                    type="button"
                    onClick={shareMenu}
                    disabled={exporting !== null}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <ShareIcon />
                    {exporting === "card" ? "Preparing…" : "Share request"}
                  </button>

                  {menuOpen && (
                    <div
                      className="harelink__share-menu"
                      role="menu"
                      aria-label="Share options"
                    >
                      <button
                        className="harelink__share-menu-item"
                        type="button"
                        role="menuitem"
                        onClick={shareViaSystem}
                        disabled={exporting !== null}
                      >
                        Share with the system
                      </button>
                      <button
                        className="harelink__share-menu-item"
                        type="button"
                        role="menuitem"
                        onClick={saveCardImage}
                        disabled={!cardImage || exporting !== null}
                      >
                        Save image (PNG)
                      </button>
                      <button
                        className="harelink__share-menu-item"
                        type="button"
                        role="menuitem"
                        onClick={shareOnX}
                      >
                        Post on X
                      </button>
                      <button
                        className="harelink__share-menu-item"
                        type="button"
                        role="menuitem"
                        onClick={shareOnWhatsApp}
                      >
                        WhatsApp
                      </button>
                      <button
                        className="harelink__share-menu-item"
                        type="button"
                        role="menuitem"
                        onClick={closeShareMenu}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="hlready__action"
                  type="button"
                  onClick={downloadQr}
                  disabled={exporting !== null}
                >
                  <QrIcon />
                  {exporting === "qr" ? "Preparing…" : "Download QR"}
                </button>

                <a
                  className="hlready__action"
                  href={`/pay/${created.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalIcon />
                  Open payment page
                </a>
              </div>

              <button
                className="hlready__textlink"
                type="button"
                onClick={reset}
              >
                Create another
              </button>

              <div className="hlready__notice">
                <p className="hlready__notice-text">
                  The payer must include memo <strong>{created.memo}</strong> so
                  HareLink can match the payment to this request.
                </p>
                <button
                  className="hlready__notice-action"
                  type="button"
                  onClick={copyMemo}
                >
                  <CopyIcon />
                  {memoCopied ? "Memo copied" : "Copy memo"}
                </button>
              </div>

              {error && (
                <p className="harelink__error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <aside className="hlready__right">
              <div className="hlready__art">
                <HareArt />
              </div>

              <div className="hlready__receipt">
                <p className="hlready__status">
                  <span className="hlready__status-dot" aria-hidden />
                  Awaiting payment
                  <span className="hlready__badge">
                    <span className="hlready__badge-dot" aria-hidden />
                    {networkLabel}
                  </span>
                </p>

                <p className="hlready__ramount">
                  {created.amount} <span>{created.assetLabel}</span>
                </p>

                <dl className="hlready__rows">
                  <div className="hlready__row">
                    <dt>Sent to</dt>
                    <dd>{truncateAddress(created.destination)}</dd>
                  </div>
                  <div className="hlready__row">
                    <dt>Memo</dt>
                    <dd>{created.memo}</dd>
                  </div>
                  <div className="hlready__row">
                    <dt>Network</dt>
                    <dd>Stellar · {networkLabel}</dd>
                  </div>
                </dl>

                <div className="hlready__scan">
                  <div className="hlready__scan-copy">
                    <p className="hlready__scan-title">Scan to pay</p>
                    <p className="hlready__scan-sub">Open with a Stellar wallet</p>
                  </div>
                  <div className="hlready__qr">
                    <QRCode
                      value={created.paymentUrl}
                      size={135}
                      role="img"
                      aria-label={`QR code for ${created.paymentUrl}`}
                    />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Tarjeta de share oculta fuera de pantalla: se exporta a PNG con
            html-to-image para el botón "Share request" y "Download QR". */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            left: "-1200px",
            pointerEvents: "none",
          }}
        >
          <ShareCard
            ref={shareCardRef}
            title={created.title}
            amount={created.amount}
            assetLabel={created.assetLabel}
            destination={created.destination}
            memo={created.memo}
            networkLabel={networkLabel}
            paymentUrl={created.paymentUrl}
          />
        </div>
      </>
    );
  }

  return (
    <form onSubmit={submit}>
      <section className="harelink__hero">
        <div className="harelink__hero-copy">
          <p className="harelink__eyebrow">HARELINK / TELLUS COOPERATIVE</p>
          <h1 className="harelink__title">Create a payment link.</h1>
          <p className="harelink__lede">
            Set the payment details once, share the link anywhere, and let
            anyone approve it from their own Stellar wallet. Funds settle
            directly to the receiving address.
          </p>
        </div>
      </section>

      <section className="harelink__builder" aria-label="Payment link builder">
        <div className="harelink__panel harelink__panel--form">
          <div className="harelink__step">
            <span className="harelink__step-num">01</span>
            <div className="harelink__step-body">
              <label
                className="harelink__step-label"
                htmlFor="harelink-title"
              >
                What is it for
              </label>
              <input
                id="harelink-title"
                className="harelink__text-input"
                type="text"
                maxLength={120}
                placeholder="Invoice #1234"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="harelink__step">
            <span className="harelink__step-num">02</span>
            <div className="harelink__step-body">
              <label
                className="harelink__step-label"
                htmlFor="harelink-amount"
              >
                Amount
              </label>
              <span className="harelink__amount">
                <input
                  id="harelink-amount"
                  className="harelink__amount-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="25.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
                <select
                  className="harelink__amount-select"
                  aria-label="Asset for amount"
                  value={selectedAssetKey}
                  onChange={(event) => setSelectedAssetKey(event.target.value)}
                >
                  {assets.map((asset) => (
                    <option key={assetKey(asset)} value={assetKey(asset)}>
                      {assetLabel(asset)}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          </div>

<div className="harelink__step">
            <span className="harelink__step-num">03</span>
            <div className="harelink__step-body">
              <label
                className="harelink__step-label"
                htmlFor="harelink-destination"
              >
                Receiving address
              </label>
              <input
                id="harelink-destination"
                className="harelink__text-input"
                type="text"
                spellCheck={false}
                autoComplete="off"
                placeholder="G…"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                required
              />
              <button
                className="harelink__ghost-button"
                type="button"
                onClick={useWalletAddress}
                disabled={connecting}
              >
                {connecting ? "Connecting…" : "Use my Freighter address"}
              </button>
              <span className="harelink__field-hint">
                Funds settle straight here. HareLink never takes custody.
              </span>
            </div>
          </div>

          <div className="harelink__step">
            <span className="harelink__step-num">04</span>
            <div className="harelink__step-body">
              <label className="harelink__step-label" htmlFor="harelink-memo">
                Memo / Optional
              </label>
              <input
                id="harelink-memo"
                className="harelink__text-input"
                type="text"
                maxLength={500}
                placeholder="e.g. 12345"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              {/* Expiración conservada internamente como "never" para no romper validación;
                  no se expone en UI para coincidir con referencia. */}
              <select
                aria-hidden
                tabIndex={-1}
                value={expiry}
                onChange={(event) => setExpiry(event.target.value as Expiry)}
                style={{ display: "none" }}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ShinyButton type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Creating…" : "Create payment link →"}
          </ShinyButton>
        </div>

        <aside className="harelink__panel harelink__panel--preview">
          <div className="harelink__preview-art">
            <HareArt />
          </div>

          <div className="harelink__preview-body">
            <p className="harelink__preview-eyebrow">
              Live preview / Testnet
              <span className="harelink__preview-badge">
                <span className="harelink__preview-badge-dot" aria-hidden />
                TESTNET
              </span>
            </p>
            <h2 className="harelink__preview-amount">
              {amount || "25.00"} <small>{assetLabel(selectedAsset)}</small>
            </h2>
            <p className="harelink__preview-sub">
              <span>For {title || "Invoice #1234"}</span>
              <span>
                {destination ? truncateAddress(destination) : "GBC2…3Z7K"}
              </span>
            </p>
            <span className="harelink__preview-link">/pay/…</span>
          </div>
        </aside>
      </section>

      {error && (
        <p className="harelink__error" role="alert">
          {error}
        </p>
      )}

      <section className="harelink__actions" style={{ justifyContent: "flex-end" }}>
        <span className="harelink__tag">Non-custodial · {networkLabel}</span>
      </section>
    </form>
  );
}
