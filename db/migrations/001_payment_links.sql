CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'testnet' CHECK (network IN ('testnet')),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('native', 'credit_alphanum')),
  asset_code TEXT NULL,
  asset_issuer TEXT NULL,
  amount TEXT NOT NULL,
  memo TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  expires_at TIMESTAMPTZ NULL,
  transaction_hash TEXT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ NULL,
  CHECK (
    (asset_type = 'native' AND asset_code IS NULL AND asset_issuer IS NULL)
    OR (asset_type = 'credit_alphanum' AND asset_code IS NOT NULL AND asset_issuer IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS payment_links_status_expires_idx
  ON payment_links (status, expires_at);
