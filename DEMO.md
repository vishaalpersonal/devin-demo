# 2-Minute Demo Script — AcmePay Ops Console

Screen recording only; voice-over read live. ~120 seconds total.
Setup: fresh seed (`pnpm prisma db seed`), dev server running, browser
maximized on `http://localhost:3000`, signed in as **Alex (Administrator)**.

| # | Time | Screen action | Voice-over beat |
|---|---|---|---|
| 1 | 0:00–0:10 | Overview page as Alex: point at sidebar (6 items), header role badge, permission chips. | "This is a purpose-built ops console replacing our three Retool apps — KYC, refunds, feature flags — on one governed foundation." |
| 2 | 0:10–0:20 | Switch user to **Sam (Support)**: sidebar shrinks (no Audit Log / Rules / KYC), flag toggles disabled. | "Permissions are enforced server-side — as a support agent the UI shrinks, and the server rejects anything the UI would have hidden." |
| 3 | 0:20–0:40 | Switch to **Alex** → `/feature-flags`. Toggle a **staging** flag: show required-reason dialog, type reason, apply. | "Every sensitive action requires a reason. Staging changes apply instantly — and everything lands in the audit log." |
| 4 | 0:40–1:00 | Toggle a **production** flag: red warning, submit → pending change request appears (approvals 0/1). Click Approve as Alex → SELF_APPROVAL error. | "Production is different: maker-checker. The change waits for approval, and the requester can't approve their own change — the server blocks it." |
| 5 | 1:00–1:20 | `/refunds` as **Sam**: issue a small refund (reason, applies instantly). Then attempt a large one → goes to pending approval. Switch to **Casey**, approve it. | "Refunds run through a ledger abstraction with idempotency keys — retries can't double-refund. Small refunds are self-serve; big ones need a second pair of eyes." |
| 6 | 1:20–1:35 | `/kyc` as **Casey**: open a case, approve with reason; show a high-risk case's extra warning. | "The KYC queue: full case context, mandatory reasons, extra friction for high-risk approvals, admin-only escalations." |
| 7 | 1:35–1:50 | `/audit-log` as Alex: filter by action, expand one event's metadata. | "Every action — including denied attempts — is in an append-only audit log; the database role literally cannot edit or delete these rows." |
| 8 | 1:50–2:00 | `/admin/rules`: bump required approvers / self-serve limit. End on Overview. | "And the guardrails themselves are configurable controls, not code changes. All standard TypeScript we own — built with Devin in hours, not weeks." |

Recording notes:
- Pause ~1s on each dialog before confirming so viewers can read it.
- Pre-clear any stale pending change requests so counts start clean.
- Keep the mouse deliberate; no scrolling mid-sentence.
