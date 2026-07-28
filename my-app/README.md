# AcmePay Ops Console — application

See the [root README](../README.md) for the quick start, feature overview,
and test users, and [ARCHITECTURE.md](../ARCHITECTURE.md) for design and
tradeoffs.

TL;DR:

```bash
pnpm start:local     # env + Postgres (Docker) + migrate + seed + dev server
pnpm test            # 32 unit + DB integration tests (DB must be up)
pnpm lint && pnpm typecheck && pnpm build
```

## Permissions

| Role | Permissions |
|---|---|
| Support Agent (Sam) | `refunds.read`, `refunds.issue`, `flags.read` |
| Compliance Reviewer (Casey) | `kyc.read`, `kyc.decide`, `refunds.read`, `refunds.approve`, `audit.read` |
| Administrator (Alex) | all permissions, incl. `flags.write`, `flags.approve`, `rules.write` |

Enforced server-side via `authorize(user, permission)`
(`lib/permissions/authorize.ts`); every mutation follows authenticate →
authorize → validate (Zod) → domain service → audit event → structured
result. `lib/services/flags.ts` is the reference implementation.

## What would be required for production

Real OIDC/SAML SSO with SCIM-provisioned roles; secrets management;
tamper-evident audit storage and retention policy; real ledger/PSP
integration with reconciliation; observability (metrics, tracing, alerting);
deploy credentials for the existing CI/CD pipeline (see `../infra/DEPLOY.md`);
backup/DR; security review, pen testing, and compliance signoff.
