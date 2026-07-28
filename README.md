# AcmePay Ops Console

A lightweight, in-house internal operations console for a fintech — a
build-vs-buy prototype of the three apps the company currently runs on
Retool: a **KYC review queue**, a **refunds dashboard**, and a
**feature-flag admin panel**, all sharing one governed foundation
(server-side RBAC, maker-checker approvals, append-only audit log).

Built with Next.js 16, TypeScript, Prisma 7, PostgreSQL 17, Tailwind, and
shadcn/ui.

## Quick start

Requires Node >= 20.19, pnpm, and Docker.

```bash
cd my-app
pnpm start:local     # → http://localhost:3000
```

One idempotent command from a fresh clone: creates `.env`, installs
dependencies, starts Postgres via Docker Compose, runs migrations and the
seed, then starts the dev server.

<details>
<summary>Equivalent manual steps</summary>

```bash
cd my-app
pnpm install
cp .env.example .env
docker compose up -d       # Postgres 17
pnpm prisma migrate dev    # runs as superuser (MIGRATE_DATABASE_URL)
pnpm prisma db seed        # users, cases, payments, flags, rules
pnpm dev                   # http://localhost:3000
```

</details>

Use the **dev user switcher** in the header to change roles:

| User | Role | Can |
|---|---|---|
| Sam Rivera | Support Agent | view payments, issue small refunds, view flags |
| Casey Nguyen | Compliance Reviewer | decide KYC cases, approve refunds, read audit log |
| Alex Okafor | Administrator | everything, incl. flag changes, approvals, governance rules |

## What the application does

- **`/kyc` — KYC review queue.** Filterable case queue with detail views
  (risk score, decision history, per-case audit trail). Approve / reject /
  escalate with a required reason; escalated cases can only be decided by an
  administrator; high-risk approvals (score ≥ configurable threshold) get an
  extra warning.
- **`/refunds` — Refunds dashboard.** Search payments, issue full or partial
  refunds through a ledger abstraction with **idempotency keys** (retries
  can't double-refund). Refunds above the self-serve limit go to a
  maker-checker approval queue; money only moves after enough *other* users
  approve.
- **`/feature-flags` — Flag admin panel.** Environment-scoped flags behind a
  provider interface (LaunchDarkly could slot in). Non-production changes
  apply immediately with a reason; production changes require approval from a
  configurable number of other users — self-approval is rejected server-side.
- **`/audit-log`** — Every sensitive action (including denied attempts) is
  recorded with actor, action, resource, result, reason, and metadata;
  filterable by actor/action/resource. The database role the app runs as
  cannot `UPDATE` or `DELETE` audit rows, and a trigger rejects both.
- **`/admin/rules`** — Governance rules editable by administrators: approval
  requirements and approver counts, the self-serve refund limit, and the
  high-risk KYC threshold. Domain services read these at decision time.

Every mutation follows the same pipeline: authenticate → authorize
(`authorize(user, permission)`, server-side) → validate (Zod) → domain
service → audit event → structured result. The UI only *reflects*
permissions; it never enforces them.

## Tests

```bash
cd my-app
pnpm test        # 32 unit + DB integration tests (database must be up)
pnpm lint
pnpm typecheck
pnpm build
```

## Repository layout

- `my-app/` — the Next.js application
  - `lib/auth` · session seam (dev switcher today; NextAuth/Okta OIDC-shaped)
  - `lib/permissions` · role→permission map + `authorize()`
  - `lib/services` · domain services (flags, kyc, refunds, governance rules)
  - `lib/audit` · audit event service
  - `lib/ledger`, `lib/flags/provider.ts` · swappable provider interfaces
  - `prisma/` · schema, migrations (incl. append-only audit grants), seed
  - `tests/` · Vitest suite
- `ARCHITECTURE.md` — one-page architecture overview, diagram, and tradeoffs
- `infra/` — mocked Pulumi sketches for ECS Fargate / Azure Container Apps /
  Cloud Run; `infra/DEPLOY.md` documents the least-privilege OIDC deploy
  setup used by `.github/workflows/deploy.yml` (deploy job disabled until
  credentials exist)

## Intentionally mocked / out of scope

Simulated auth (real OIDC/Okta drops into `lib/auth`), mock ledger, DB-backed
flag store, never-deployed infra, and an audit log that is append-only but
not tamper-evident (no hash chaining / WORM). This is a prototype, not a
production system — see `ARCHITECTURE.md` for limitations and what
production would require. It deliberately does not recreate Retool's app
builder, connectors, or workflow engine.
