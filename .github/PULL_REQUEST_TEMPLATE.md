## What this changes

<!-- One paragraph. What behavior is different after this PR? -->

Closes #

## Why

<!-- The problem this solves. Link the issue or the discussion that motivated it. -->

## How to verify

<!-- Steps a reviewer can follow. Testnet data only. -->

1.
2.
3.

## Checklist

- [ ] The PR is focused on one concern and links its issue.
- [ ] Behavior changes come with tests named for behavior (e.g. `rejects a reused transaction hash`).
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass locally.
- [ ] Amounts stay normalized decimal strings or fixed-precision decimals — no JavaScript floating point.
- [ ] Every browser-supplied value is validated on the server.
- [ ] No private keys, seed phrases, credentials, or personal data in code, fixtures, screenshots, or commits.
- [ ] No unpurchased or placeholder domain appears in the UI, docs, or metadata.
- [ ] Documentation updated if setup, configuration, or supported assets changed.

## Screenshots

<!-- For UI changes: before and after, desktop and ~375px. Delete this section otherwise. -->

## Notes for the reviewer

<!-- Anything you are unsure about, or decisions you would like challenged. -->
