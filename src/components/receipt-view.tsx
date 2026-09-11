export interface ReceiptData {
  transactionHash: string;
  asset: string;
  amount: string;
  paidAt: string;
  explorerUrl: string;
}

export interface ReceiptViewProps {
  title: string;
  destination: string;
  networkLabel: string;
  receipt: ReceiptData;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export default function ReceiptView({
  title,
  destination,
  networkLabel,
  receipt,
}: ReceiptViewProps) {
  return (
    <section className="paylink__builder" aria-label="Payment receipt">
      <div className="paylink__panel paylink__panel--form">
        <p className="paylink__preview-eyebrow">Verified on Stellar</p>
        <h2 className="paylink__result-title">{title}</h2>
        <p className="paylink__lede">
          The network confirmed this payment. The funds went straight to the
          receiving address — Paylink never held them.
        </p>

        <div className="paylink__preview-rows">
          <div className="paylink__preview-row">
            <span className="paylink__preview-row-label">Amount</span>
            <span className="paylink__preview-row-value">
              {receipt.amount} {receipt.asset}
            </span>
          </div>
          <div className="paylink__preview-row">
            <span className="paylink__preview-row-label">Transaction</span>
            <span className="paylink__preview-row-value">
              {truncateAddress(receipt.transactionHash)}
            </span>
          </div>
          {receipt.paidAt && (
            <div className="paylink__preview-row">
              <span className="paylink__preview-row-label">Paid at</span>
              <span className="paylink__preview-row-value">
                {new Date(receipt.paidAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="paylink__result-actions">
          <a
            className="paylink__primary"
            href={receipt.explorerUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer <span aria-hidden>↗</span>
          </a>
        </div>
      </div>

      <aside className="paylink__panel paylink__panel--preview">
        <div className="paylink__preview-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/paylink-verified.webp" alt="" aria-hidden />
          <span className="paylink__preview-status is-verified">
            <span className="paylink__status-dot" aria-hidden />
            Verified
          </span>
        </div>

        <div className="paylink__preview-body">
          <p className="paylink__preview-eyebrow">Receipt</p>
          <h2 className="paylink__preview-amount">
            {receipt.amount} <small>{receipt.asset}</small>
          </h2>
          <div className="paylink__preview-rows">
            <div className="paylink__preview-row">
              <span className="paylink__preview-row-label">Sent to</span>
              <span className="paylink__preview-row-value">
                {truncateAddress(destination)}
              </span>
            </div>
            <div className="paylink__preview-row">
              <span className="paylink__preview-row-label">Network</span>
              <span className="paylink__preview-row-value">
                Stellar · {networkLabel}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
