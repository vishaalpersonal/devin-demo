# Architecture — AcmePay Ops Console

One shared foundation, three thin purpose-built apps. Not a Retool clone: a
governed interface for sensitive operational actions.

```mermaid
flowchart LR
  subgraph Browser
    UI[Next.js pages + shadcn/ui components]
  end
  subgraph Server["Next.js server (single deployable container)"]
    SA[Server actions]
    AUTHN["lib/auth — getSession()\n(dev switcher today, NextAuth/Okta OIDC later)"]
    AUTHZ["lib/permissions — authorize(user, permission)"]
    RULES["lib/services/rules — governance rules\n(approver counts, limits)"]
    SVC["Domain services\nflags | refunds | kyc"]
    AUDIT["lib/audit — recordAuditEvent()"]
    FLAGP["FlagProvider interface\n(DB today, LaunchDarkly later)"]
    LEDGER["LedgerProvider interface\n(mock today, PSP/ledger later)"]
  end
  subgraph Postgres["PostgreSQL (docker-compose locally; RDS/Azure PG/Cloud SQL in prod)"]
    TABLES[(domain tables)]
    AE[("audit_events\napp role: INSERT+SELECT only\ntrigger rejects UPDATE/DELETE")]
  end
  UI --> SA --> AUTHN --> AUTHZ --> SVC
  SVC --> RULES
  SVC --> FLAGP --> TABLES
  SVC --> LEDGER
  SVC --> AUDIT --> AE
  SVC --> TABLES
```

## Mutation pipeline (every sensitive action)

authenticate (`requireSession`) → authorize (`authorize(user, permission)`,
throws; DENIED attempts are themselves audited) → validate (Zod, structured
errors) → domain service (business rules incl. maker-checker: requester ≠
approver, N approvers from governance rules) → audit event → structured
result. UI hiding/disabling is cosmetic only; everything is re-checked
server-side.

## Boundaries and why

- **Auth seam** (`lib/auth`): `getSession()` is the only identity source.
  Swap the dev cookie switcher for NextAuth + Okta OIDC without touching any
  page or service — the `Session` shape is the contract.
- **Coarse permissions vs. contextual rules**: `authorize()` stays a static
  role→permission map (auditable, testable); contextual policy (approval
  thresholds, refund limits) lives in `GovernanceRule` rows edited on
  `/admin/rules` and interpreted inside domain services. Avoids a policy
  engine while keeping rules centralized. Okta groups could later map to
  roles; rules stay app-owned.
- **Audit at the DB layer**: the runtime role (`app_user`) cannot UPDATE or
  DELETE `audit_events` (grants revoked, trigger as second layer). Both are
  created by Prisma migrations, so any fresh environment gets them. Honest
  caveat: not tamper-evident (no hash chain/WORM; superuser bypasses).
- **Provider interfaces**: `FlagProvider` and `LedgerProvider` isolate the
  parts most likely to be vendor-backed (LaunchDarkly, Stripe/internal
  ledger). Refunds add an idempotency ledger (`ProcessedAction`) so retries
  after failures cannot double-move money.
- **Cloud-agnostic by construction**: the app is one container needing only
  `DATABASE_URL` (runtime, restricted role) and `MIGRATE_DATABASE_URL`
  (migration job). `infra/` sketches Pulumi stacks for ECS Fargate, Azure
  Container Apps, and Cloud Run — mocked, never deployed, no credentials.
  Serverless targets need connection pooling (pgBouncer/RDS Proxy) noted as a
  known gap.

## Key tradeoffs

| Decision | Chose | Over | Why |
|---|---|---|---|
| Authorization | static permission map + DB rules | policy engine (OPA etc.) | 3 apps, ~10 permissions; auditable in one file |
| Approval model | generic maker-checker w/ configurable approver count | per-app bespoke flows | one control reused by flags → refunds → KYC |
| Audit integrity | grants + trigger | hash-chained/WORM store | 10 lines of SQL buys most of the demo value; rest documented |
| Flags | own store behind interface | wrapping LaunchDarkly now | demo needs a source of truth; interface keeps the lazy path open |
| Tests | focused unit + DB integration | broad coverage | prove the security-critical paths (authz, maker-checker, append-only) |

## Known limitations

Mock auth (no real SSO/MFA); audit not tamper-evident; no rate limiting or
CSRF hardening beyond framework defaults; no observability stack; refunds/KYC
workflows are placeholders pending the next iterations; infra and CI/CD are
mocked (no deploy credentials); single-node Postgres, no HA/backup story.
