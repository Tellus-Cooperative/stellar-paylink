"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

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

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.paymentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard is blocked. Copy the link manually.");
    }
  }

  function reset() {
    setCreated(null);
    setTitle("");
    setAmount("");
    setDescription("");
    setExpiry("never");
    setCopied(false);
  }

  if (created) {
    return (
      <section className="paylink__builder" aria-label="Payment link created">
        <div className="paylink__panel paylink__panel--form">
          <p className="paylink__preview-eyebrow">Link ready</p>
          <h2 className="paylink__result-title">{created.title}</h2>

          <label className="paylink__field">
            <span className="paylink__field-label">Share this link</span>
            <input
              className="paylink__text-input"
              value={created.paymentUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>

          <div className="paylink__result-actions">
            <button
              className="paylink__primary"
              type="button"
              onClick={copyLink}
            >
              {copied ? "Copied" : "Copy link"} <span aria-hidden>↗</span>
            </button>
            <a
              className="paylink__ghost-button"
              href={`/pay/${created.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Open payment page
            </a>
            <button
              className="paylink__ghost-button"
              type="button"
              onClick={reset}
            >
              Create another
            </button>
          </div>

          <p className="paylink__field-hint">
            The payer signs a transaction carrying memo{" "}
            <strong>{created.memo}</strong>. Without that memo the payment
            cannot be matched back to this link.
          </p>
        </div>

        <aside className="paylink__panel paylink__panel--preview">
          <div className="paylink__preview-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="paylink__preview-arrow"
              src="/create-share-arrow.png"
              alt="Glass arrow pointing upward, representing a shared payment link"
            />
          </div>

          <div className="paylink__preview-body">
            <p className="paylink__preview-eyebrow">Awaiting payment</p>
            <h2 className="paylink__preview-amount">
              {created.amount} <small>{created.assetLabel}</small>
            </h2>

            <div className="paylink__preview-rows">
              <div className="paylink__preview-row">
                <span className="paylink__preview-row-label">Sent to</span>
                <span className="paylink__preview-row-value">
                  {truncateAddress(created.destination)}
                </span>
              </div>
              <div className="paylink__preview-row">
                <span className="paylink__preview-row-label">Memo</span>
                <span className="paylink__preview-row-value">
                  {created.memo}
                </span>
              </div>
              <div className="paylink__preview-row">
                <span className="paylink__preview-row-label">Network</span>
                <span className="paylink__preview-row-value">
                  Stellar · {networkLabel}
                </span>
              </div>
              <div className="paylink__preview-row">
                <span className="paylink__preview-row-label">Scan to pay</span>
                <span className="paylink__preview-row-value">
                  <span
                    style={{
                      display: "inline-block",
                      background: "#fff",
                      padding: 10,
                      borderRadius: 12,
                    }}
                  >
                    <QRCode
                      value={created.paymentUrl}
                      size={148}
                      role="img"
                      aria-label={`QR code for ${created.paymentUrl}`}
                    />
                  </span>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    );
  }

  return (
    <form onSubmit={submit}>
      <section className="paylink__builder" aria-label="Payment link builder">
        <div className="paylink__panel paylink__panel--form">
          <div className="paylink__step">
            <span className="paylink__step-num">01</span>
            <div className="paylink__step-body">
              <label
                className="paylink__step-label"
                htmlFor="paylink-title"
              >
                What is it for
              </label>
              <input
                id="paylink-title"
                className="paylink__text-input"
                type="text"
                maxLength={120}
                placeholder="Invoice #1234"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="paylink__step">
            <span className="paylink__step-num">02</span>
            <div className="paylink__step-body">
              <label
                className="paylink__step-label"
                htmlFor="paylink-amount"
              >
                Amount
              </label>
              <span className="paylink__amount">
                <input
                  id="paylink-amount"
                  className="paylink__amount-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="25.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
                <select
                  className="paylink__amount-select"
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

          <div className="paylink__step">
            <span className="paylink__step-num">03</span>
            <div className="paylink__step-body">
              <span className="paylink__step-label">Asset</span>
              <div
                className="paylink__asset-row"
                role="group"
                aria-label="Asset to charge"
              >
                {assets.map((asset) => {
                  const key = assetKey(asset);
                  const active = key === selectedAssetKey;
                  return (
                    <button
                      key={key}
                      className={`paylink__asset-chip${
                        active ? " is-active" : ""
                      }`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedAssetKey(key)}
                    >
                      {assetLabel(asset)}
                    </button>
                  );
                })}
              </div>
              {assets.length === 1 && (
                <span className="paylink__field-hint">
                  Only XLM is enabled. Set USDC_ASSET_ISSUER to offer credit
                  assets.
                </span>
              )}
            </div>
          </div>

          <div className="paylink__step">
            <span className="paylink__step-num">04</span>
            <div className="paylink__step-body">
              <label
                className="paylink__step-label"
                htmlFor="paylink-destination"
              >
                Receiving address
              </label>
              <input
                id="paylink-destination"
                className="paylink__text-input"
                type="text"
                spellCheck={false}
                autoComplete="off"
                placeholder="G…"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                required
              />
              <button
                className="paylink__ghost-button"
                type="button"
                onClick={useWalletAddress}
                disabled={connecting}
              >
                {connecting ? "Connecting…" : "Use my Freighter address"}
              </button>
              <span className="paylink__field-hint">
                Funds settle straight here. Paylink never takes custody.
              </span>
            </div>
          </div>

          <div className="paylink__step">
            <span className="paylink__step-num">05</span>
            <div className="paylink__step-body">
              <label className="paylink__step-label" htmlFor="paylink-memo">
                Memo / Optional
              </label>
              <input
                id="paylink-memo"
                className="paylink__text-input"
                type="text"
                maxLength={500}
                placeholder="Coffee for the team"
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

          <button
            className="paylink__primary"
            type="submit"
            disabled={!canSubmit}
          >
            {submitting ? "Creating…" : "Create payment link →"}
          </button>
        </div>

        <aside className="paylink__panel paylink__panel--preview">
          <div className="paylink__preview-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="paylink__preview-arrow"
              src="/create-share-arrow.png"
              alt="Glass arrow pointing upward, representing a shared payment link"
            />
          </div>

          <div className="paylink__preview-body">
            <p className="paylink__preview-eyebrow">
              Live preview / Testnet
              <span className="paylink__preview-badge">
                <span className="paylink__preview-badge-dot" aria-hidden />
                TESTNET
              </span>
            </p>
            <h2 className="paylink__preview-amount">
              {amount || "25.00"} <small>{assetLabel(selectedAsset)}</small>
            </h2>
            <p className="paylink__preview-sub">
              <span>For {title || "Invoice #1234"}</span>
              <span>
                {destination ? truncateAddress(destination) : "GBC2…3Z7K"}
              </span>
            </p>
            <span className="paylink__preview-link">paylink.to/8F3K9</span>
          </div>
        </aside>
      </section>

      {error && (
        <p className="paylink__error" role="alert">
          {error}
        </p>
      )}

      <section className="paylink__actions" style={{ justifyContent: "flex-end" }}>
        <span className="paylink__tag">Non-custodial · {networkLabel}</span>
      </section>
    </form>
  );
}
