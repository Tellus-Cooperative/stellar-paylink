import { writeFileSync, readFileSync, existsSync } from "node:fs";

import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON = "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";
const USDC = new Asset(
  "USDC",
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
);
const API = process.env.API_BASE ?? "http://localhost:3100";
const PASSPHRASE = "Test SDF Network ; September 2015";
const KEYS_FILE = process.env.KEYS_FILE ?? "/tmp/harelink-smoke-keys.json";

const server = new Horizon.Server(HORIZON);

// ── keypair persistence ──────────────────────────────────────────────
function loadOrCreateKeys() {
  if (existsSync(KEYS_FILE)) {
    const raw = JSON.parse(readFileSync(KEYS_FILE, "utf8"));
    console.log("loaded existing keypairs from", KEYS_FILE);
    return {
      payer: Keypair.fromSecret(raw.payerSecret),
      receiver: Keypair.fromSecret(raw.receiverSecret),
    };
  }
  const payer = Keypair.random();
  const receiver = Keypair.random();
  writeFileSync(
    KEYS_FILE,
    JSON.stringify(
      { payerSecret: payer.secret(), receiverSecret: receiver.secret() },
      null,
      2
    )
  );
  console.log("generated new keypairs, saved to", KEYS_FILE);
  return { payer, receiver };
}

// ── stellar helpers ──────────────────────────────────────────────────
async function fund(kp) {
  try {
    await server.loadAccount(kp.publicKey());
    return false; // already funded
  } catch {
    /* not funded yet */
  }
  const res = await fetch(`${FRIENDBOT}?addr=${kp.publicKey()}`);
  if (!res.ok) throw new Error(`friendbot: ${res.status}`);
  return true;
}

async function hasTrustline(kp) {
  const acc = await server.loadAccount(kp.publicKey());
  return acc.balances.some(
    (b) => b.asset_code === "USDC" && b.asset_issuer === USDC.getIssuer()
  );
}

async function addTrustline(kp) {
  const acc = await server.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(acc, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  await server.submitTransaction(tx);
}

async function usdcBalance(pub) {
  const acc = await server.loadAccount(pub);
  const line = acc.balances.find(
    (b) => b.asset_code === "USDC" && b.asset_issuer === USDC.getIssuer()
  );
  return line ? Number(line.balance) : 0;
}

async function requestCircleUsdc(addr) {
  const res = await fetch("https://faucet.circle.com/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: addr,
      blockchain: "stellar-testnet",
    }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.slice(0, 300) };
}

// ── main ─────────────────────────────────────────────────────────────
const { payer, receiver } = loadOrCreateKeys();

console.log("payer    ", payer.publicKey());
console.log("receiver ", receiver.publicKey());

// 1. fund XLM if needed
const payerFunded = await fund(payer);
const receiverFunded = await fund(receiver);
if (payerFunded || receiverFunded) {
  console.log("friendbot funded new accounts; waiting 5s for ledger…");
  await new Promise((r) => setTimeout(r, 5000));
}

// 2. trustlines
if (!(await hasTrustline(payer))) {
  console.log("adding USDC trustline (payer)…");
  await addTrustline(payer);
} else {
  console.log("payer trustline exists");
}
if (!(await hasTrustline(receiver))) {
  console.log("adding USDC trustline (receiver)…");
  await addTrustline(receiver);
} else {
  console.log("receiver trustline exists");
}

// 3. USDC balance
let bal = await usdcBalance(payer.publicKey());
console.log("payer USDC balance:", bal);

if (bal < 1) {
  console.log("\n── USDC needed ──────────────────────────────────");
  console.log("Faucets failed automatically. Fund USDC manually:");
  console.log("  1. Open https://faucet.circle.com");
  console.log("  2. Select network: Stellar Testnet");
  console.log("  3. Paste this address:");
  console.log("    ", payer.publicKey());
  console.log("  4. Select USDC and submit");
  console.log("  5. Re-run this script once funded:");
  console.log("       node scripts/usdc-smoke.mjs");
  console.log("──────────────────────────────────────────────────\n");
  process.exit(0);
}

// 4. full payment flow
console.log("\n── creating payment link ─────────────────────────");
const createRes = await fetch(`${API}/api/links`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    destination: receiver.publicKey(),
    asset: { type: "credit_alphanum", code: "USDC", issuer: USDC.getIssuer() },
    amount: "5",
    title: "USDC smoke test",
  }),
});
const createdBody = await createRes.json();
console.log("create:", createRes.status, JSON.stringify(createdBody).slice(0, 400));
if (createRes.status !== 201) process.exit(1);
const { slug, memo, amount } = createdBody.data.link;
console.log("slug:", slug, "memo:", memo, "amount:", amount);

console.log("\n── submitting USDC payment ──────────────────────");
const acc = await server.loadAccount(payer.publicKey());
const tx = new TransactionBuilder(acc, {
  fee: BASE_FEE,
  networkPassphrase: PASSPHRASE,
  memo: Memo.text(memo),
})
  .addOperation(
    Operation.payment({
      destination: receiver.publicKey(),
      asset: USDC,
      amount,
    })
  )
  .setTimeout(60)
  .build();
tx.sign(payer);
const submitted = await server.submitTransaction(tx);
if (!submitted.successful) throw new Error("payment failed");
console.log("tx hash:", submitted.hash);

console.log("\n── verifying ────────────────────────────────────");
const verifyRes = await fetch(`${API}/api/links/${slug}/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ transactionHash: submitted.hash }),
});
const verifyBody = await verifyRes.json();
console.log("verify:", verifyRes.status, JSON.stringify(verifyBody));

const receiptRes = await fetch(`${API}/receipt/${slug}`);
console.log("receipt page status:", receiptRes.status);
