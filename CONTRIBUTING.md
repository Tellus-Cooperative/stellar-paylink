# Contributing to Stellar HareLink

Thanks for considering a contribution. This is a community open-source utility: small, reviewable pull requests matter more than large ones.

## Ground rules

- Keep pull requests focused on one concern and link the related issue.
- Include tests for behavior changes. Name them for behavior (e.g. `rejects a reused transaction hash`).
- Never place private keys, seed phrases, credentials, or personal data in an issue, fixture, screenshot, or commit.
- Amounts are normalized decimal strings or fixed-precision decimals — never JavaScript floating point.
- Every browser-supplied value must be validated on the server.

## Development setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

With `DATABASE_URL` set, run `pnpm db:migrate` first; without it the app uses the in-memory store. Integration tests need `DATABASE_URL_TEST`:

```bash
DATABASE_URL_TEST="postgresql:///stellar_paylink?host=/tmp" pnpm test
```

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass. CI is green before merge — no exceptions.

## Branches and commits

- Branches: `feat/...`, `fix/...`, `docs/...`.
- Commits: concise Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `test:`.
- No AI attribution footers in commits.

## Issues

Use acceptance criteria and a priority label: `P0 release blocker`, `P1 sprint`, or `P2 later`. Good first issues are labeled `good first issue` or `help wanted`.

## Security

Do not report vulnerabilities in public issues. See [SECURITY.md](./SECURITY.md) for the private process.

## Code of conduct

Participation in this project is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). Report a concern privately to the maintainers, never in a public issue.
