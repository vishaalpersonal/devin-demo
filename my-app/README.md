# AcmePay Ops Console

A ~2-hour prototype of a lightweight in-house alternative to Retool for a
Series C fintech: the **shared foundation** for three purpose-built internal
apps — a KYC review queue, a refunds dashboard, and a feature-flag admin
panel — plus the first working application (feature flags).

This is intentionally **not** a generalized internal-tools platform: no
drag-and-drop builder, no generic query engine, no connector framework. It is
a governed interface for sensitive operational actions.

## What it demonstrates

- **Server-side RBAC**: a central `authorize(user, permission)` check; the UI
  only reflects permissions, it never enforces them.
- **Governance rules**: admin-editable contextual controls (approval
  requirements, approver counts, self-serve refund limits) interpreted by
  domain services, on `/admin/rules`.
- **Maker-checker**: production feature-flag changes require approval from a
  configurable number of *other* users; self-approval is rejected server-side.
- **Append-only audit log**: every sensitive mutation records an audit event;
  the app's DB role has no `UPDATE`/`DELETE` grants on `audit_events` and a
  trigger rejects both.
- **Swappable boundaries**: auth (`lib/auth`), flag store
  (`lib/flags/provider.ts`), and ledger (`lib/ledger`) are interfaces with
  local implementations, designed for OIDC/Okta, LaunchDarkly, and a real
  PSP/ledger respectively.

## Setup

Requires Node >= 20.19, pnpm, and Docker.

```bash
pnpm start:local              # http://localhost:3000
```

One command, idempotent, works from a fresh clone: copies `.env.example` to
`.env` if missing, installs dependencies, starts Postgres 17 via Docker and
waits for its healthcheck, runs migrations (as superuser via
`MIGRATE_DATABASE_URL`) and the idempotent seed, then starts the dev server.

Equivalent manual steps:

```bash
pnpm install
cp .env.example .env
docker compose up -d          # local Postgres 17
pnpm prisma migrate dev       # migrations run as superuser (MIGRATE_DATABASE_URL)
pnpm prisma db seed           # users, flags, rules, sample data
pnpm dev                      # http://localhost:3000
```

Run tests (unit + DB integration; requires the database from above):

```bash
pnpm test
```

Lint / typecheck: `pnpm lint` / `pnpm typecheck`.

## Test users and permissions

Switch users with the dev switcher in the header (dev-only, replaced by real
auth in production).

| Role | Permissions |
|---|---|
| Support Agent (Sam) | `refunds.read`, `refunds.issue`, `flags.read` |
| Compliance Reviewer (Casey) | `kyc.read`, `kyc.decide`, `refunds.read`, `refunds.approve`, `audit.read` |
| Administrator (Alex) | all permissions, incl. `flags.write`, `flags.approve`, `rules.write` |

## Execution flow for every mutation

authenticate → authorize permission → validate input (Zod) → domain service →
record audit event → return structured result. See
`lib/services/flags.ts` for the reference implementation.

## Intentionally mocked / limited

- **Auth**: simulated session + user switcher. The `Session` shape matches
  what a NextAuth OIDC (Okta) provider returns; only `lib/auth` knows how
  sessions are produced.
- **Ledger**: `lib/ledger` is a mock provider behind an interface.
- **Flag store**: database-backed provider; the console is an admin panel over
  the `FlagProvider` interface, not necessarily the source of truth.
- **Infra**: `../infra` contains a mocked, never-deployed Pulumi program
  sketching ECS Fargate / Azure Container Apps / Cloud Run deployments.
- **Audit**: append-only via grants + trigger. This is NOT a production
  immutable or tamper-evident audit system (no hash chaining, no WORM
  storage, superuser can still bypass).

## What would be required for production

Real OIDC/SAML SSO with SCIM-provisioned roles; secrets management; tamper-
evident audit storage and retention policy; real ledger/PSP integration with
reconciliation; observability (metrics, tracing, alerting); CI/CD with deploy
credentials; backup/DR; security review, pen testing, and compliance signoff.

## What this does not attempt to replace from Retool

The visual app builder, generic database/API connectors, the workflow engine,
managed hosting and its SOC2 surface, and the marginal-cost-near-zero creation
of *additional* internal tools. This repo bets that three specific apps on a
shared governed foundation are worth owning; it does not recreate the
platform.
