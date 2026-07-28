---
name: testing-ops-console
description: How to run and E2E-test the AcmePay Ops Console (my-app/) — services, personas, and feature-flag maker-checker mechanics.
---

# Testing AcmePay Ops Console (my-app/)

## Run
- Postgres 17 via `docker compose up -d` in `my-app/` (container `my-app-db-1`). `.env` has `DATABASE_URL` (app_user) and `MIGRATE_DATABASE_URL` (superuser, used by `prisma migrate`).
- Node >= 20.19 (Node 22 via `n`), `pnpm install`, `pnpm dev` → http://localhost:3000. Dev server log historically at /tmp/devserver.log.
- Unit tests: `pnpm test` (Vitest). Warning: the test suite writes fixture rows (users "T Admin", "T Admin 2", "T Support", flags like `test-flag-*`) into the SAME dev database — reseed (`pnpm db:seed` or the seed script) before demo recordings if you want a pristine switcher/flag list.

## Personas (header "Dev user switcher" Select)
- Alex Okafor — administrator (only seeded admin; has flags.write/approve, rules.write)
- Casey Nguyen — compliance reviewer (audit.read, no rules.read)
- Sam Rivera — support agent (flags.read only; toggles render disabled, restricted nav)

## Key mechanics to assert
- Flag toggle dialog (ConfirmActionDialog): confirm button stays disabled until reason ≥ 10 chars.
- PRODUCTION toggles show a red "Production change" alert and create a pending change request (maker-checker) instead of applying; non-prod applies immediately.
- Self-approval returns `SELF_APPROVAL — You cannot approve your own change request` and is itself audited (flag.approval_denied). Since Alex is the only seeded admin, fully applying a prod change isn't possible via seeded personas — demonstrating the block is the expected test.
- Governance rules at /admin/rules (`flags.requireApproval`, `flags.requiredApprovers`) control the maker-checker; edits emit `rule.updated` audit events. Revert values after testing.
- /audit-log filters (actor/action/resource) are URL-param based; metadata rows expand via "view" `<details>`.
