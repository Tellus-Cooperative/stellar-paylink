# Security Policy

## Scope

Stellar Paylink is experimental, unaudited software running on Stellar Testnet. It is not a bank, exchange, custodian, or audited payment processor. Test with Testnet assets only.

## Reporting a vulnerability

**Do not open a public issue for a suspected vulnerability.**

Report it privately through GitHub Private Vulnerability Reporting on this repository (Security tab → Report a vulnerability). Include:

- What you found and where (file, route, or commit).
- Steps to reproduce, ideally with Testnet data only.
- What you think the impact is (funds at risk, state spoofing, data exposure).

Never include active secrets, seed phrases, or private keys in a report. If you accidentally expose one, rotate it immediately and tell us it was exposed without pasting it again.

## What to expect

- Acknowledgement of a valid report.
- A fix prioritized by severity, plus credit if you want it.
- Public disclosure only after a fix is available.

## Assumptions you can rely on

- The app never asks for private keys or seed phrases. Anything that does is not this project.
- A link becomes `paid` only after server-side verification against Stellar network data.
- The public deployment is Testnet-only. Mainnet configuration is disabled until a separate release review.
