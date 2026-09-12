# Stellar HareLink — Roadmap

This roadmap separates the seven-day `v0.1.0` release from later product development. Dates after the first release are directional and should change only after usage and contributor feedback.

## Project framing

HareLink is a community open-source utility, not a hackathon demo. It competes on openness: a forkable verification-server for payment links that produces a provable receipt. The payment-link directory is crowded with merchant platforms, but a small, MIT-licensed, non-custodial utility with strict server-side verification remains a real gap. Design for honoring external contributions and measuring community signals (forks, PRs, ten-minute setups), not vanity metrics.

## Checklist operativo v0.1.0

Fuente de verdad para marcar avance. Solo se marca `[x]` lo verificado con comando o prueba real.

### Hecho (verificado 2026-09-11)

- [x] Base server-side: `src/lib/config/env.ts`, `src/lib/stellar/*`, `src/lib/payments/amount.ts`, `src/lib/validation/link-schema.ts`.
- [x] API: `POST /api/links`, `GET /api/links/[slug]`, `POST /api/links/[slug]/verify` (idempotente, códigos estables).
- [x] Storage: interfaz `src/lib/db/types.ts` + adaptador en memoria.
- [x] Wallet: `src/lib/wallet/freighter.ts`, `src/lib/stellar/payment-tx.ts`, `src/app/pay/[slug]/pay-client.tsx` (conectar → firmar → submitir → verificar con reintentos).
- [x] `src/app/create/create-form.tsx` conectado a `POST /api/links` con copiar link.
- [x] Calidad en verde: `pnpm typecheck`, `pnpm test` (62/62), `pnpm lint` (0 errores), `pnpm build`.
- [x] Tooling: pnpm + `pnpm-lock.yaml`, vitest, `target ES2020`.
- [x] Docs: README posicionado, `plan.md` estado, framing + wallets-kit v0.2 en este roadmap.

### P0 — sin esto no funciona de verdad

- [x] Prueba end-to-end real en Testnet (2026-09-11): link `KKkFtIe5GN4c`, pago 3.5 XLM con memo `PL7SAXFZ73ZBUX5Y`, tx `28878649…a9d8183`, verify → recibo + estado `paid`; reintento idempotente. Nota: la firma se hizo con keypair directo (equivalente al XDR que firma Freighter); el signing vía extensión queda para prueba manual con wallet.
- [x] Adaptador PostgreSQL (2026-09-11): migración `db/migrations/001_payment_links.sql` + `pnpm db:migrate`, `PostgresLinkStore` con `markPaid` atómico (`SELECT FOR UPDATE` + `UPDATE … WHERE status='pending'`, unique backstop 23505), selector por `DATABASE_URL`, 7 tests de integración (incluye carrera 10× `markPaid` → gana exactamente 1), smoke API→PG→API (`slug gdsDLI1yA8ex`).
- [x] Configurar `USDC_ASSET_ISSUER` de Testnet y probar el flujo con trustline (2026-09-11): issuer canónico Circle `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` en `.env.example` (verificado en docs Stellar/Circle/testanchor); sin trustline → `422 DESTINATION_NOT_READY`; con trustline → `201`; pago+verify de crédito probado end-to-end con asset equivalente (25.5 TST, tx `524af439…a7ff7b7f` → `paid`).
- [x] Pago en USDC canónico (2026-09-12): link `s6yyxjJEAjo0`, memo `PLJRDKN2663BM2DQ`, 5 USDC real de Circle, tx `fb5a28cf…e830b602` → `verify verified:true` con recibo y explorerUrl. Funding del faucet de Circle vía UI manual (requiere captcha web, no hay API pública).

### P1 — sin esto no hay release open-source

- [x] Agregar `LICENSE` (MIT, 2026 Tellus Cooperative).
- [x] Agregar `CONTRIBUTING.md` (pnpm, gates, conventional commits, sin secretos).
- [x] Agregar `SECURITY.md` (reporte privado vía GitHub, alcance Testnet, supuestos).
- [x] Acción QR para compartir el link (`react-qr-code` en el panel de éxito de `/create`).
- [x] Decidir `/receipt/[slug]` y `/docs`: receipt implementado como ruta propia (`src/app/receipt/[slug]/page.tsx`, `ReceiptView` compartido con `/pay`); `/docs` descartado (README + CONTRIBUTING + SECURITY ya cubren setup/integración/seguridad).
- [x] Re-autenticar Raven (opencode MCP stellar-raven; verificado operativo 2026-09-12).
- [x] Plantillas de issues (`.github/ISSUE_TEMPLATE/`: bug, feature con backlog policy, config con canal de seguridad).

### P2 — endurecimiento

- [x] Rate limits en `POST /api/links` (20/min) y verify (60/min) con `429 RATE_LIMITED` + `Retry-After` (verificado en vivo: 20 pasan, resto 429). In-memory por proceso; documentar Redis si hay multi-instancia.
- [x] Headers seguros vía `src/proxy.ts` (antes `middleware.ts`; Next 16.3 lo marca deprecado): CSP (scripts externos bloqueados; `unsafe-inline` documentado como limitación hasta nonces), `nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS. Verificado en vivo en `/`, `/create`, `/pay`, `/receipt`.
- [x] Suite e2e Playwright (`playwright.config.ts`, `tests/e2e/flow.spec.ts` 6 tests + `screenshots.spec.ts` desktop/mobile, todo en verde 2026-09-11).
- [x] Re-verde e2e tras últimos cambios (2026-09-12): test de teclado + screenshots desktop/mobile, 9/9 en verde (~9s).
- [x] CI GitHub Actions (2026-09-12): pipeline `quality` (typecheck + lint + test + build) y `secrets-scan` (gitleaks binario, 0 leaks) en `main` y en PRs. Gitleaks corrido localmente y limpio (5.25 MB, 0 findings).
- [x] Migrar `src/middleware.ts` → `src/proxy.ts` (Next 16.3 marca middleware como deprecado; headers verificados).
- [x] Tests de integración API (`tests/integration/api/links.test.ts`, 8 tests): creación solo con valores normalizados, link expirado no paga (410), hash reutilizado se rechaza (409), idempotencia.
- [x] Corregido `Number(amount)` en `src/app/create/create-form.tsx` (usa `parseAmount().ok`, sin float).
- [x] Pass accesibilidad estático en `/create` y `/pay/[slug]`: inputs con label, botones con nombre, imágenes decorativas con `alt=""`/aria-hidden, errores con `role="alert"`, estados con texto, controles nativos por teclado. Falta verificación con lector de pantalla.
- [x] Screenshots, demo corta, deploy `v0.1.0-rc.1`, prueba clean-room de clone (2026-09-12): screenshots `create-success`/`create-share-menu` añadidos al spec; demo GIF en `demo/harelink-demo.gif` (5 estados, 9s); rc publicado en GitHub (`v0.1.0-rc.1`, release notes en https://github.com/Tellus-Cooperative/stellar-paylink/releases) y en vivo en `https://stellar-paylink-lac.vercel.app`; clean-room local: clone → `cp .env.example .env.local` → install → build → `pnpm start` → landing 200, API 201 (hallazgo corregido: `.env.example` forzaba `DATABASE_URL` de Postgres inexistente; ahora vacío para almacén in-memory, `2db2e61`).
- [ ] Clean-room con tester externo y tag `v0.1.0` (release day 6 Sep: dar el README a alguien sin contexto del proyecto, clonar/desplegar/pagar; luego tag + release notes + anuncio).
- [x] Deploy en Vercel (2026-09-11): `https://stellar-paylink-lac.vercel.app` en verde (landing 200, imágenes 200, API 201). Hallazgos: preset Next.js vía `vercel.json`, landing desde `public/` + `outputFileTracingIncludes`, imágenes en `public/`. Neon conectado: migración aplicada, env vars (`DATABASE_URL` pooled+SSL, `NEXT_PUBLIC_APP_URL`, `USDC_ASSET_ISSUER`) y e2e en prod verificado (link `mjfc5uawvCdt`, pago 1.5 XLM tx `4bb4d15b…c3caf1` → `paid`, fila confirmada en Neon).
- [x] Corregido `paymentUrl` en producción (2026-09-12): deploy con build en la nube (no `--prebuilt` local) por ejemplo `http://localhost:3000/pay/…`; variables `NEXT_PUBLIC_*` se incrustan en build-time y el `.env.production.local` local las tenía vacías. Deploy `99x9viinn` → `https://stellar-paylink-lac.vercel.app/pay/…` verificado vía `POST /api/links`.

## Release sequence

| Release | Target | Outcome |
| --- | --- | --- |
| `v0.1.0` | Sep 16, 2026 | Forkable Testnet payment links for XLM and configured USDC |
| `v0.2.0` | After MVP feedback | Better asset configuration, receipts, localization, and wallet coverage |
| `v0.3.0` | After repeated creator use | Optional creator identity, dashboard, and reliable notifications |
| `v0.4.0` | After integration demand | Embeddable button, SDK, and webhooks |
| `v1.0.0` | After security review and stable use | Production-ready release criteria and optional Mainnet deployment path |

## Seven-day release sprint

### Day 1 — Thursday, September 10: lock and scaffold

**Goal:** remove ambiguity and produce a runnable foundation.

- Freeze `v0.1.0` scope and acceptance criteria.
- Create repository, project board, milestones, and branch protection.
- Scaffold Next.js, TypeScript, styles, test runner, lint, and CI.
- Add Tellus design tokens and base page shell.
- Implement environment validation.
- Land the storage contract and the in-memory adapter; the PostgreSQL adapter is the next swap.
- Publish README, `plan.md`, and `roadmap.md`.

**Exit test:** a clean clone installs, runs, tests, and builds. The storage boundary (`src/lib/db/types.ts`) works and the PostgreSQL adapter is scheduled.

### Day 2 — Friday, September 11: create and share

**Goal:** a creator can produce a valid public request.

- Build the create-link form (wire the existing mock to `POST /api/links`).
- Validate destination, asset, issuer, amount, text limits, and expiration. Server-side Zod validation and API routes are already in place.
- Generate a random slug and unique Stellar-safe memo/reference.
- Persist the payment request.
- Build `/pay/[slug]` in the `pending` state.
- Add copy-link and QR-code actions.
- Add API and form tests.

**Exit test:** a valid link can be created, reopened, and shared; invalid data cannot be stored.

### Day 3 — Saturday, September 12: XLM vertical slice

**Goal:** complete the entire product loop with native XLM.

- Add the Freighter wallet adapter (kept behind an adapter boundary).
- Detect missing wallet, rejected connection, and wrong network.
- Build a Testnet XLM payment transaction with the exact memo.
- Request wallet signature and submit the transaction.
- Finish server-side verification wiring (matching engine is implemented and unit-tested).
- Atomically record `paid` state and transaction hash.
- Build the verified receipt.

**Exit test:** create → share → sign → submit → verify → receipt works with XLM on Testnet.

**Scope checkpoint:** if this exit test fails, pause USDC and visual extras until it passes.

### Day 4 — Sunday, September 13: harden verification

**Goal:** make false-positive payment status difficult.

- Test wrong destination, amount, asset, memo, network, and unsuccessful transaction.
- Test duplicate and replayed transaction hashes.
- Make verification idempotent under repeated requests.
- Add explicit pending, expired, and already-paid states.
- Add stable API error codes and user-facing recovery messages.
- Review logging and database atomicity.

**Exit test:** automated negative cases pass and only a correct ledger transaction changes state.

### Day 5 — Monday, September 14: configured USDC and mobile

**Goal:** support the second asset without weakening safety.

- Add validated USDC code and issuer configuration.
- Check destination account and trustline/readiness.
- Build and verify the credit-asset payment operation.
- Cover insufficient balance/reserve and missing-trustline states.
- Finish responsive layout and touch targets.
- Confirm QR flow using a second device.

**Exit test:** configured USDC Testnet flow works end to end and fails clearly when the destination cannot receive the asset.

### Day 6 — Tuesday, September 15: release candidate

**Goal:** make the repository safe to hand to another developer.

- Complete unit, integration, and browser tests.
- Run accessibility and keyboard checks.
- Add secure headers, endpoint rate limits, and secret scanning.
- Verify `LICENSE`; add `CONTRIBUTING.md`, `SECURITY.md`, issue templates, and `.env.example`.
- Write deployment and asset-configuration instructions.
- Capture screenshots and a short demo.
- Deploy release candidate `v0.1.0-rc.1`.

**Exit test:** CI is green, the production build runs, and no release-blocking security issue is open.

### Day 7 — Wednesday, September 16: clean-room test and release

**Goal:** prove forkability and publish the project.

- Give the README to someone who did not build the project.
- Perform a fresh clone, configuration, deployment, and Testnet payment.
- Fix only release blockers; move enhancements to the backlog.
- Confirm Testnet labels and experimental notice throughout the app.
- Publish the live demo, screenshots, and announcement.
- Tag `v0.1.0`, publish release notes, and open starter issues.

**Exit test:** an external tester deploys and completes a payment using the published documentation.

## Cut line if the schedule slips

The release date is protected by cutting scope in this order:

1. Remove optional visual customization.
2. Remove downloadable receipt image.
3. Ship English only.
4. Support Freighter only.
5. Move USDC to `v0.1.1` only if XLM is complete and USDC is the final blocker.

Never cut server-side verification, Testnet-only defaults, secret-key protections, negative tests, or basic documentation. If the XLM vertical slice is not stable, publish a release candidate instead of calling the project complete.

## `v0.2.0` — adoption improvements

Prioritize only items supported by real feedback:

- Additional wallet adapters: swap the single-wallet boundary for the community `stellar-tools/stellar-wallets-kit`, enabling multi-wallet connection per fork without touching verification.
- Spanish and Portuguese interfaces.
- Multiple explicitly configured credit assets.
- Better receipt export and print view.
- Creator-side cancellation with a secure ownership mechanism.
- Payment-status polling and reconnect recovery.
- Fork branding through documented configuration.
- Broader accessibility and device testing.

## `v0.3.0` — creator operations

- Optional authentication.
- Creator dashboard and payment-link history.
- Reusable links, only with a redesigned reconciliation model.
- Search and filtering.
- Notification preferences.
- Data export.
- Retention and deletion controls.

Authentication remains optional for the public payment page and must not introduce custody.

## `v0.4.0` — integrations

- Embeddable payment button.
- Small TypeScript SDK.
- Signed, retryable webhooks.
- API keys with scoped permissions.
- Integration examples for common web frameworks.
- Versioned API documentation.

Integration work starts only after the core API and verification contract are stable.

## `v1.0.0` — production-readiness milestone

`v1.0.0` is not simply a larger feature release. It requires evidence that the project is stable enough for production-oriented evaluation:

- Independent security review completed and findings addressed.
- Threat model and operational runbook published.
- Stable versioned API and migration policy.
- Backups, recovery, monitoring, and alerting documented.
- Dependency and vulnerability maintenance process active.
- Mainnet configuration guarded by explicit opt-in and deployment documentation.
- Multiple successful external forks or integrations.
- Clear support and maintenance policy.

Mainnet availability does not mean that Tellus holds funds or guarantees a payment, asset, issuer, wallet, fork, or third-party deployment.

## Success measures

### Release measures

- One clean external fork and deployment completed.
- XLM and configured USDC Testnet flows pass end to end.
- All payment-verification negative tests pass.
- Zero private-key or seed-phrase inputs anywhere in the product.
- CI passes lint, type checks, tests, and build.
- Installation-to-local-run time under ten minutes for a prepared developer.

### Adoption signals after release

- Meaningful forks and deployments, not only stars.
- External pull requests or documentation improvements.
- Payment links completed successfully on the demo.
- Setup issues reported with reproducible details.
- Requests for integrations that repeat across more than one user or organization.

Metrics must avoid collecting personal data that is not necessary to operate and improve the application.

## Backlog policy

Every proposal should answer:

1. Which user problem does it solve?
2. Does it preserve non-custody?
3. Can it be verified against network data?
4. Does it improve forkability or make it worse?
5. What new security, privacy, and maintenance cost does it create?
6. Which release milestone should own it?

Ideas that cannot answer these questions stay in discussion rather than entering a release milestone.

## Public communication milestones

| Moment | What to publish |
| --- | --- |
| Repository opens | Problem statement, Testnet status, scope, contribution labels |
| XLM vertical slice works | Short technical progress clip; clearly label it Testnet |
| Release candidate | Call for setup, wallet, and edge-case testing |
| `v0.1.0` | Demo, screenshots, fork instructions, release notes, and known limitations |
| Post-release | What was learned, issues selected for `v0.2.0`, and contributor acknowledgements |

The public message should describe what is working today and avoid presenting roadmap items as shipped features.
