/**
 * Integration tests against the local docker-compose Postgres.
 * Requires `docker compose up -d` and `pnpm prisma migrate dev` first.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decideKycCase } from "@/lib/services/kyc";
import { AuthError } from "@/lib/permissions/authorize";
import type { SessionUser } from "@/lib/auth";
import type { KycStatus } from "@/app/generated/prisma/client";

const run = randomUUID().slice(0, 8);

let admin: SessionUser;
let compliance: SessionUser;
let support: SessionUser;

beforeAll(async () => {
  const [a, c, s] = await Promise.all([
    prisma.user.create({
      data: { email: `kyc-admin-${run}@t.dev`, name: "T Admin", role: "ADMINISTRATOR" },
    }),
    prisma.user.create({
      data: {
        email: `kyc-compliance-${run}@t.dev`,
        name: "T Compliance",
        role: "COMPLIANCE_REVIEWER",
      },
    }),
    prisma.user.create({
      data: { email: `kyc-support-${run}@t.dev`, name: "T Support", role: "SUPPORT_AGENT" },
    }),
  ]);
  admin = a;
  compliance = c;
  support = s;
});

afterAll(async () => {
  await prisma.$disconnect();
});

function createCase(status: KycStatus, riskScore = 30) {
  return prisma.kycCase.create({
    data: {
      customerName: `T Customer ${run}`,
      customerEmail: `kyc-case-${randomUUID().slice(0, 8)}-${run}@t.dev`,
      riskScore,
      status,
    },
  });
}

describe("decideKycCase", () => {
  it("rejects callers without kyc.decide server-side", async () => {
    const kycCase = await createCase("PENDING");
    await expect(
      decideKycCase(support, {
        caseId: kycCase.id,
        decision: "APPROVE",
        reason: "support should not be able to do this",
      }),
    ).rejects.toThrow(AuthError);
  });

  it("returns structured validation errors for short reasons", async () => {
    const kycCase = await createCase("PENDING");
    const result = await decideKycCase(compliance, {
      caseId: kycCase.id,
      decision: "APPROVE",
      reason: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION");
  });

  it("rejects invalid state transitions (already-closed cases)", async () => {
    const kycCase = await createCase("APPROVED");
    const result = await decideKycCase(compliance, {
      caseId: kycCase.id,
      decision: "REJECT",
      reason: "attempting to decide a closed case",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_STATE");
  });

  it("applies a decision and records an audit event with metadata", async () => {
    const kycCase = await createCase("IN_REVIEW", 42);
    const result = await decideKycCase(compliance, {
      caseId: kycCase.id,
      decision: "APPROVE",
      reason: "documents verified in integration test",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.kycCase.status).toBe("APPROVED");

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "kyc.decided", resourceId: kycCase.id },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(compliance.id);
    const metadata = audit?.metadata as Record<string, unknown>;
    expect(metadata.from).toBe("IN_REVIEW");
    expect(metadata.to).toBe("APPROVED");
    expect(metadata.riskScore).toBe(42);
    expect(metadata.reason).toBe("documents verified in integration test");
  });

  it("records kyc.escalated audit events for escalations", async () => {
    const kycCase = await createCase("PENDING");
    const result = await decideKycCase(compliance, {
      caseId: kycCase.id,
      decision: "ESCALATE",
      reason: "needs enhanced due diligence review",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.kycCase.status).toBe("ESCALATED");

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "kyc.escalated", resourceId: kycCase.id },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(compliance.id);
  });

  it("only lets administrators decide escalated cases (denials audited)", async () => {
    const kycCase = await createCase("ESCALATED");

    const denied = await decideKycCase(compliance, {
      caseId: kycCase.id,
      decision: "APPROVE",
      reason: "compliance attempting escalated decision",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("ESCALATED_ADMIN_ONLY");

    const deniedAudit = await prisma.auditEvent.findFirst({
      where: {
        action: "kyc.decision_denied",
        resourceId: kycCase.id,
        result: "DENIED",
      },
    });
    expect(deniedAudit).not.toBeNull();

    const unchanged = await prisma.kycCase.findUnique({ where: { id: kycCase.id } });
    expect(unchanged?.status).toBe("ESCALATED");

    const decided = await decideKycCase(admin, {
      caseId: kycCase.id,
      decision: "REJECT",
      reason: "admin rejecting escalated case in test",
    });
    expect(decided.ok).toBe(true);
    if (decided.ok) expect(decided.data.kycCase.status).toBe("REJECTED");
  });

  it("cannot re-escalate an escalated case", async () => {
    const kycCase = await createCase("ESCALATED");
    const result = await decideKycCase(admin, {
      caseId: kycCase.id,
      decision: "ESCALATE",
      reason: "attempting to escalate twice in test",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_STATE");
  });

  it("flags approvals at or above kyc.highRiskThreshold as high risk", async () => {
    const highRiskCase = await createCase("PENDING", 95);
    const result = await decideKycCase(compliance, {
      caseId: highRiskCase.id,
      decision: "APPROVE",
      reason: "high risk approval for integration test",
    });
    expect(result.ok).toBe(true);

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "kyc.decided", resourceId: highRiskCase.id },
    });
    const metadata = audit?.metadata as Record<string, unknown>;
    expect(metadata.highRisk).toBe(true);
    expect(metadata.highRiskThreshold).toBe(80);

    const lowRiskCase = await createCase("PENDING", 10);
    const lowResult = await decideKycCase(compliance, {
      caseId: lowRiskCase.id,
      decision: "APPROVE",
      reason: "low risk approval for integration test",
    });
    expect(lowResult.ok).toBe(true);

    const lowAudit = await prisma.auditEvent.findFirst({
      where: { action: "kyc.decided", resourceId: lowRiskCase.id },
    });
    const lowMetadata = lowAudit?.metadata as Record<string, unknown>;
    expect(lowMetadata.highRisk).toBe(false);
  });
});
