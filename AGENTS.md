# Repository Guidelines

## Project Status and Structure

This repository currently contains the approved `v0.1.0` plan rather than an application scaffold. Treat [README.md](README.md), `plan.md`, and `roadmap.md` as the source of truth until implementation lands. The planned Next.js layout is `app/` for routes and API handlers, `components/` for reusable UI, `lib/` for database, Stellar, validation, and wallet adapters, `public/` for static assets, and `tests/` for automated coverage.

Keep the trust boundary explicit: browser code proposes payments; server code validates and verifies them against Stellar network data. Never move database, verification, or secret-bearing configuration into client bundles.

## Development Commands

There is no `package.json` or runnable code yet, so no commands can currently be executed. Once the planned scaffold is added, use pnpm:

```bash
pnpm dev        # run the local Next.js app
pnpm lint       # check lint rules
pnpm typecheck  # run TypeScript checks
pnpm test       # run unit and integration tests
pnpm test:e2e   # run browser tests
pnpm build      # create a production build
```

Document any new required command in the README and keep CI aligned with it.

## Code and Testing Expectations

Use TypeScript, Zod for shared input and environment validation, and normalized decimal strings or fixed-precision decimals for amounts—never JavaScript floating point. Keep Stellar asset code and issuer together, validate every browser-supplied value on the server, and make verification idempotent.

Add focused unit tests for validation and amount handling, integration tests for link state and verification, and Playwright coverage for the create-to-receipt flow. Name tests for behavior, for example `rejects a reused transaction hash`. Include negative cases for destination, amount, asset, issuer, memo, network, and transaction reuse.

## Commits and Pull Requests

Use concise Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, and `test:`. Branch names follow `feat/...`, `fix/...`, or `docs/...`. Keep pull requests small and single-purpose, link the related issue, and ensure CI is green before merge.

## Security and Configuration

The public MVP is Testnet-only. Never commit private keys, seed phrases, credentials, personal data, or populated `.env` files. Use a secret-free `.env.example`; allowlist supported assets and require an explicit issuer for credit assets. Report vulnerabilities through the private process described by the future `SECURITY.md`, not public issues.
