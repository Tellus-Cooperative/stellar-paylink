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
    <section className="harelink__builder" aria-label="Payment receipt">
      <div className="harelink__panel harelink__panel--form">
        <p className="harelink__preview-eyebrow">Verified on Stellar</p>
        <h2 className="harelink__result-title">{title}</h2>
        <p className="harelink__lede">
          The network confirmed this payment. The funds went straight to the
          receiving address — HareLink never held them.
        </p>

        <div className="harelink__preview-rows">
          <div className="harelink__preview-row">
            <span className="harelink__preview-row-label">Amount</span>
            <span className="harelink__preview-row-value">
              {receipt.amount} {receipt.asset}
            </span>
          </div>
          <div className="harelink__preview-row">
            <span className="harelink__preview-row-label">Transaction</span>
            <span className="harelink__preview-row-value">
              {truncateAddress(receipt.transactionHash)}
            </span>
          </div>
          {receipt.paidAt && (
            <div className="harelink__preview-row">
              <span className="harelink__preview-row-label">Paid at</span>
              <span className="harelink__preview-row-value">
                {new Date(receipt.paidAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="harelink__result-actions">
          <a
            className="harelink__primary"
            href={receipt.explorerUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer <span aria-hidden>↗</span>
          </a>
        </div>
      </div>

      <aside className="harelink__panel harelink__panel--preview">
        <div className="harelink__preview-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/harelink-verified.webp" alt="" aria-hidden />
          <span className="harelink__preview-status is-verified">
            <span className="harelink__status-dot" aria-hidden />
            Verified
          </span>
        </div>

        <div className="harelink__preview-body">
          <p className="harelink__preview-eyebrow">Receipt</p>
          <h2 className="harelink__preview-amount">
            {receipt.amount} <small>{receipt.asset}</small>
          </h2>
          <div className="harelink__preview-rows">
            <div className="harelink__preview-row">
              <span className="harelink__preview-row-label">Sent to</span>
              <span className="harelink__preview-row-value">
                {truncateAddress(destination)}
              </span>
            </div>
            <div className="harelink__preview-row">
              <span className="harelink__preview-row-label">Network</span>
              <span className="harelink__preview-row-value">
                Stellar · {networkLabel}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
