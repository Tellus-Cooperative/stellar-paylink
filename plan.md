# Stellar HareLink — Delivery Plan

**Release target:** `v0.1.0` on September 16, 2026

**Release network:** Stellar Testnet

**License:** MIT

**Product owner:** Tellus Cooperative

**Status:** Implementation in progress. Scope approved for `v0.1.0`; the create/read/verify API slice is implemented and tested. The wallet flow, receipt, and PostgreSQL adapter remain.

## 1. Release objective

Ship a complete, public, forkable Testnet application that lets a user create a fixed XLM or configured USDC payment request, share it as a link or QR code, receive a wallet-signed payment, and show a receipt only after independent network verification.

The sprint is successful when a developer who is unfamiliar with the codebase can fork it, follow the README, deploy it, and complete an end-to-end Testnet payment without asking Tellus for private configuration.

## 2. Product principles

1. **Non-custodial by construction.** The application never asks for or stores private keys or seed phrases.
2. **Verify, do not trust.** The client cannot mark its own payment as successful.
3. **Testnet first.** Mainnet is not a sprint deliverable.
4. **One excellent flow.** Creating and completing a single-use payment link matters more than optional features.
5. **Forkability is a feature.** Setup, asset configuration, deployment, and extension points must be documented.
6. **No hidden asset assumptions.** Every non-native asset is defined by code and issuer, then allowlisted.
7. **Brand is separate from code licensing.** Forks may reuse MIT-licensed code without implying a relationship with Tellus.

## 3. Scope lock

### Must ship in `v0.1.0`

| Capability | Acceptance summary |
| --- | --- |
| Link creation | Valid Stellar destination, exact positive amount, supported asset, title, optional description, expiration |
| Unique reference | Unguessable public slug and a memo/reference that fits Stellar constraints |
| Public payment page | Clear recipient, amount, asset, network, expiration, and status |
| XLM payments | Build, sign in wallet, submit, and verify on Testnet |
| USDC payments | Configured asset code + issuer, destination trustline/readiness check, sign and verify on Testnet |
| Wallet flow | Freighter-first connection, rejection handling, wrong-network handling, no secret-key input |
| Sharing | Copyable URL and QR code with a downloadable or reusable representation |
| Verification | Server verifies all expected transaction fields and rejects reused transaction hashes |
| State model | `pending`, `paid`, and `expired` |
| Receipt | Transaction hash, verified details, timestamp, and explorer link |
| Responsive UI | Complete flow at mobile and desktop widths |
| Open-source baseline | README, MIT license, contributing guide, security policy, issue templates, screenshots |
| Deployment | Documented local setup and one tested production-style Testnet deployment |

### Ship only if the core flow is already green

- Custom accent color or logo for forks.
- Downloadable receipt image.
- Manual creator-side cancellation using a creator secret/token.
- Spanish interface translation.
- Alternative Stellar wallet adapters.

### Explicitly out of scope

- Mainnet public launch.
- Custody, embedded wallets, account creation, or recovery.
- Login, teams, merchant dashboard, customer database, or analytics.
- Fiat conversion, swaps, exchange quotes, card payments, or off-chain settlement.
- Refunds, disputes, split payments, tips, installments, subscriptions, or recurring billing.
- Soroban contracts.
- Webhooks, SDK packages, plugins, and embeddable widgets.
- Stellar Passport or an Event Kit. Passport remains a separate, non-open-source Tellus product.

Scope additions require removing work of equal or greater size from the `Must ship` list. No scope is added after September 12.

## 4. Primary user stories

### Payment-link creator

- As a creator, I can enter a destination account, amount, asset, title, and expiration.
- As a creator, I see validation before a link is created.
- As a creator, I can copy the URL or show a QR code.
- As a creator, I can revisit the link and see whether it is pending, paid, or expired.
- As a creator, I can inspect the verified transaction hash after payment.

### Payer

- As a payer, I can understand exactly who, how much, which asset, and which network I am about to pay.
- As a payer, I connect my wallet and approve the final transaction there.
- As a payer, I get useful messages when the wallet is missing, on the wrong network, rejects the request, lacks funds, or submission fails.
- As a payer, I receive a verified receipt after ledger inclusion.

### Fork maintainer

- As a maintainer, I can configure the application without editing source files.
- As a maintainer, I can allowlist my intended Stellar credit asset and issuer.
- As a maintainer, I can run lint, type checks, tests, and a production build through documented commands.
- As a maintainer, I can deploy a fork from a fresh clone in ten minutes or less, excluding account-provider signup time.

## 5. User flows

### Create a payment link

1. Open `/create`.
2. Enter the destination Stellar public account.
3. Select XLM or the configured USDC asset.
4. Enter a fixed amount, title, optional description, and expiration.
5. Validate the address, decimal precision, amount bounds, asset availability, and destination readiness.
6. Create a database record with a random slug and unique memo/reference.
7. Return the public payment URL and QR code.

### Complete a payment

1. Open `/pay/[slug]`.
2. Fetch safe public details and confirm the link is payable.
3. Connect a wallet.
4. Confirm account, network, balance, and trustline requirements.
5. Build the transaction from canonical server-provided payment data.
6. Show the final request and ask the wallet to sign.
7. Submit to Stellar Testnet.
8. Send the resulting transaction hash to the verification endpoint.
9. Verify the transaction against network data.
10. Atomically record payment and display the receipt.

### Revisit a link

- `pending`: show payment action.
- `paid`: disable payment and show verified receipt.
- `expired`: disable payment and explain expiration.

## 6. Technical architecture

### Components

| Component | Responsibility | Trust level |
| --- | --- | --- |
| Next.js browser app | Forms, wallet connection, transaction proposal, status UI | Untrusted for final status |
| API routes | Validate inputs, create links, return public data, verify payments | Trusted application boundary |
| PostgreSQL | Store expected payment data, states, and transaction hashes | Authoritative application state |
| Stellar Horizon | Account readiness, transaction and operation lookup | Authoritative network data |
| Wallet extension/app | Hold keys and authorize signatures | User-controlled |

### Architectural rules

- Use classic Stellar `Payment` operations; no Soroban contract is required.
- Store monetary amounts as normalized decimal strings or fixed-precision decimals, never JavaScript floating-point numbers.
- Construct credit assets from both asset code and issuer.
- Keep server-only database and verification code out of client bundles.
- Treat every value supplied by the browser as untrusted, including the transaction hash.
- Make verification idempotent and payment recording atomic.
- Keep network and supported assets in validated configuration.

## 7. Data model

### `payment_links`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Internal primary key |
| `slug` | String, unique | Random public identifier; no sequential IDs |
| `destination` | String | Canonical Stellar account supported by the MVP |
| `network` | Enum | `testnet` in `v0.1` |
| `asset_type` | Enum | `native` or `credit_alphanum` |
| `asset_code` | Nullable string | Required for USDC |
| `asset_issuer` | Nullable string | Required for USDC |
| `amount` | Decimal/string | Exact normalized amount |
| `memo` | String, unique | Generated correlation reference |
| `title` | String | Short public title |
| `description` | Nullable string | Short sanitized public context |
| `status` | Enum | `pending`, `paid`, `expired` |
| `expires_at` | Timestamp | Server-enforced expiration |
| `transaction_hash` | Nullable string, unique | Set only after verification |
| `created_at` | Timestamp | Server timestamp |
| `paid_at` | Nullable timestamp | Ledger or verified payment time |

Indexes: unique `slug`, unique `memo`, unique nullable `transaction_hash`, and an index on `status + expires_at`.

No customer names, emails, wallet secrets, IP histories, or unrelated personal data are required for the MVP.

## 8. API contract

### `POST /api/links`

Validates the request, checks destination readiness, creates the record, and returns:

- `slug`
- `paymentUrl`
- safe public payment fields
- current status

It must not accept a client-selected `paid` state, transaction hash, network override, issuer outside the allowlist, or memo.

### `GET /api/links/[slug]`

Returns only the public fields required to display and pay the request. It derives expiration server-side before responding.

### `POST /api/links/[slug]/verify`

Accepts a transaction hash, loads authoritative expected values from the database, queries the configured Stellar network, performs every verification rule, and atomically stores a successful result.

Repeated requests for the same verified transaction must return the existing receipt rather than create a duplicate payment.

## 9. Verification algorithm

A transaction is accepted only when all checks pass:

1. The link exists and is still eligible for verification.
2. The hash resolves on the configured network.
3. The transaction completed successfully and appears in a ledger.
4. The transaction memo equals the link's generated reference.
5. At least one payment operation matches the exact destination, asset, issuer, and normalized amount.
6. The ledger close time is not earlier than link creation and respects the defined expiration policy.
7. The transaction hash is not attached to a different link.
8. The database update from `pending` to `paid` succeeds atomically.

If a check fails, the API returns a stable error code without exposing internal configuration or stack traces.

## 10. Security requirements

- Never render an input for a private key or seed phrase.
- Reject unsupported networks, assets, issuers, account formats, amounts, and memo types.
- Define whether muxed accounts are supported; reject them clearly if not implemented in `v0.1`.
- Normalize and compare amounts with asset precision rules.
- Sanitize public text and set length limits.
- Rate-limit link creation and verification endpoints.
- Use cryptographically random slugs and references.
- Add secure headers and a restrictive Content Security Policy compatible with the wallet flow.
- Prevent transaction-hash reuse with both an application check and a unique database constraint.
- Avoid logging full request bodies, wallet secrets, credentials, or unnecessary identifiers.
- Keep `.env*` out of Git and publish a secret-free `.env.example`.
- Run dependency, secret, lint, type, test, and build checks before release.
- Document a private vulnerability-reporting path in `SECURITY.md`.

## 11. Interface requirements

### Visual system

- Use Tellus Sand `#ECE0CC` and Teal `#3F8487` as core brand tokens.
- Use a tested dark text/background pairing that meets WCAG AA contrast.
- Do not rely on color alone for status.
- Keep product screens focused; organization storytelling belongs on the landing page, not in the checkout flow.

### Required states

Every async area must render loading, success, empty, invalid, and recoverable error states. The wallet flow must cover:

- wallet unavailable
- connection rejected
- wrong network
- insufficient XLM for balance or fees
- missing trustline for a credit asset
- transaction rejected by user
- transaction submission failure
- verification pending
- verification mismatch
- link already paid or expired

## 12. Test plan

### Unit tests

- Stellar address validation.
- Amount normalization, bounds, and decimal precision.
- Asset allowlist and issuer matching.
- Memo/reference generation length and uniqueness.
- Link-state transitions.
- Verification-field matching.

### Integration tests

- Link creation writes only normalized server-approved values.
- Expired link cannot initiate payment.
- A valid Testnet transaction marks exactly one link paid.
- Wrong destination, amount, asset, issuer, memo, network, or unsuccessful transaction is rejected.
- Reused transaction hash is rejected for a different link.
- Repeated verification for the same link is idempotent.

### End-to-end tests

- Create, share, pay, verify, and view a receipt on Testnet.
- XLM happy path.
- Configured USDC happy path with recipient trustline.
- Wallet rejection and wrong-network recovery.
- Mobile viewport and keyboard navigation.
- Fresh-clone setup and deployment rehearsal.

## 13. Work breakdown

### Foundation

- [ ] Create public repository and branch protection.
- [ ] Scaffold Next.js, TypeScript, styling, lint, format, and test tools.
- [ ] Add Tellus tokens and base responsive layout.
- [ ] Add environment schema and `.env.example`.
- [ ] Add database schema and migrations.

### Link creation

- [ ] Build validated form.
- [ ] Add destination account and credit-asset readiness checks.
- [ ] Implement secure slug and memo generation.
- [ ] Implement `POST /api/links`.
- [ ] Build share URL, copy action, and QR view.

### Payment

- [ ] Add wallet connection adapter.
- [ ] Build XLM payment transaction.
- [ ] Build configured USDC payment transaction.
- [ ] Handle wallet and network error states.
- [ ] Submit transaction and capture hash.

### Verification and receipt

- [ ] Implement network lookup and strict verification.
- [ ] Make state transition atomic and idempotent.
- [ ] Build live status and receipt pages.
- [ ] Add transaction explorer link.
- [ ] Test invalid and duplicate transaction cases.

### Release quality

- [ ] Complete responsive and accessibility pass.
- [ ] Add unit, integration, and end-to-end tests.
- [ ] Verify `LICENSE`; add `CONTRIBUTING.md`, `SECURITY.md`, and issue templates.
- [ ] Add screenshots, demo GIF/video, and deployment instructions.
- [ ] Test a clean fork and fresh deployment.
- [ ] Tag `v0.1.0` and publish release notes.

## 14. Definition of done

`v0.1.0` is done only when:

- A new Testnet XLM link can be created and paid end to end.
- A configured Testnet USDC link can be created and paid end to end.
- No payment can become `paid` from client state alone.
- Negative verification tests cover destination, amount, asset, issuer, memo, network, and transaction reuse.
- The application never requests or stores a private key or seed phrase.
- The complete flow works on a real mobile viewport and a desktop viewport.
- Lint, type checks, tests, and production build pass in CI.
- No critical or high-severity dependency issue is knowingly shipped.
- A clean clone can be configured and deployed from the README.
- The public repository includes the MIT license, contribution guide, security policy, screenshots, roadmap, and clear experimental/Testnet notice.

## 15. Release gates

| Gate | Owner | Deadline | Pass condition |
| --- | --- | --- | --- |
| Scope freeze | Product | Sep 10 | Must/should/out list approved |
| Architecture | Engineering | Sep 10 | Data model and verification rules agreed |
| XLM vertical slice | Engineering | Sep 12 | Create → sign → submit → verify → receipt works |
| USDC vertical slice | Engineering | Sep 14 | Trustline-aware Testnet flow works |
| Quality gate | Engineering | Sep 15 | CI, security checks, mobile, and error states pass |
| Fork test | External tester | Sep 16 | Fresh clone/deploy works from docs |
| Release | Maintainer | Sep 16 | Demo live, tag and release notes published |

## 16. Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Wallet integration takes longer than expected | Core flow blocked | Support one wallet first; keep adapter boundary for later wallets |
| Testnet USDC configuration is unreliable | Asset flow blocked | Keep issuer configurable; validate it at startup; never hardcode an unverified issuer |
| Credit-asset destination lacks trustline | Payment cannot complete | Preflight recipient account and show an explicit requirement before signing |
| Verification race or duplicate callback | Incorrect state | Idempotent endpoint, row lock/transaction, unique transaction hash |
| Scope growth | Release slips | Scope freeze and equal-size removal rule |
| Public unauthenticated endpoint is abused | Cost/noise | Rate limits, strict input bounds, expiry, and monitoring |
| A fresh fork requires undocumented setup | Open-source goal fails | Perform a clean-room deployment test before release |
| Mainnet expectations form too early | User risk | Testnet labels on every payment surface; Mainnet configuration disabled in public release |

## 17. Delivery conventions

- Default branch: `main`, always releasable.
- Feature branches: `feat/...`, `fix/...`, `docs/...`.
- Pull requests: small, one concern, linked to an issue, green CI required.
- Commits: concise conventional prefixes such as `feat:`, `fix:`, `docs:`, and `test:`.
- Daily checkpoint: record completed work, demoable state, blocker, next task, and scope change.
- Issues: use acceptance criteria and a priority label: `P0 release blocker`, `P1 sprint`, or `P2 later`.

## 18. Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-09-10 | Build payment links first | Clear, reusable Stellar utility with a small end-to-end surface |
| 2026-09-10 | Testnet-only public MVP | Reduces user and operational risk during the first release |
| 2026-09-10 | Use classic Payment operations | Smart contracts add no necessary capability to the MVP |
| 2026-09-10 | XLM + configured USDC | Covers native and credit-asset payment patterns without opening arbitrary assets |
| 2026-09-10 | Single-use links | Simplifies verification, receipt state, and duplicate prevention |
| 2026-09-10 | Passport excluded | It is a separate Tellus product and will not be open sourced here |
| 2026-09-10 | English-first technical docs | Makes the repository accessible to the global Stellar developer ecosystem |

## 19. Immediate next action

The API foundation is live (`POST /api/links`, `GET /api/links/[slug]`, `POST /api/links/[slug]/verify`) with an in-memory store and unit tests. The next step is the XLM vertical slice: wire `/pay/[slug]` to the Freighter wallet adapter, submit a Testnet payment with the exact memo, then confirm the receipt through the implemented verification endpoint. PostgreSQL persistence lands right after the vertical slice proves the flow.
