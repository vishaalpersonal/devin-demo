import "server-only";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/permissions/authorize";
import type { SessionUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { getRuleInt, RULE_KEYS } from "@/lib/services/rules";
import {
  failure,
  kycDecisionSchema,
  success,
  type ActionResult,
} from "@/lib/validation";
import type { KycCase, KycStatus } from "@/app/generated/prisma/client";

export type KycDecision = "APPROVE" | "REJECT" | "ESCALATE";

const DECISION_TARGET: Record<KycDecision, KycStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  ESCALATE: "ESCALATED",
};

/**
 * Domain rules:
 * - Only PENDING or IN_REVIEW cases can be decided by anyone with kyc.decide.
 * - ESCALATED cases can only be decided (approved/rejected) by an
 *   ADMINISTRATOR; they cannot be escalated again. Denied attempts are
 *   audited with result DENIED.
 * - APPROVED / REJECTED are terminal.
 * - Governance rule kyc.highRiskThreshold: approvals of cases at or above the
 *   threshold are flagged high-risk in the audit metadata (the UI shows an
 *   extra confirmation warning).
 */
export async function decideKycCase(
  user: SessionUser,
  input: unknown,
): Promise<ActionResult<{ kycCase: KycCase }>> {
  authorize(user, "kyc.decide");

  const parsed = kycDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { caseId, decision, reason } = parsed.data;

  const kycCase = await prisma.kycCase.findUnique({ where: { id: caseId } });
  if (!kycCase) return failure("NOT_FOUND", "KYC case not found");

  if (kycCase.status === "ESCALATED") {
    if (decision === "ESCALATE") {
      return failure("INVALID_STATE", "Case is already escalated");
    }
    if (user.role !== "ADMINISTRATOR") {
      await recordAuditEvent({
        actor: user,
        action: "kyc.decision_denied",
        resourceType: "KycCase",
        resourceId: kycCase.id,
        result: "DENIED",
        metadata: {
          rule: "escalated cases can only be decided by an administrator",
          decision,
        },
      });
      return failure(
        "ESCALATED_ADMIN_ONLY",
        "Escalated cases can only be decided by an administrator",
      );
    }
  } else if (kycCase.status !== "PENDING" && kycCase.status !== "IN_REVIEW") {
    return failure(
      "INVALID_STATE",
      `Case is ${kycCase.status} and can no longer be decided`,
    );
  }

  const targetStatus = DECISION_TARGET[decision];
  const highRiskThreshold = await getRuleInt(RULE_KEYS.kycHighRiskThreshold);
  const highRisk = kycCase.riskScore >= highRiskThreshold;

  const updated = await prisma.kycCase.update({
    where: { id: caseId },
    data: { status: targetStatus },
  });

  await recordAuditEvent({
    actor: user,
    action: decision === "ESCALATE" ? "kyc.escalated" : "kyc.decided",
    resourceType: "KycCase",
    resourceId: kycCase.id,
    result: "SUCCESS",
    metadata: {
      customer: kycCase.customerName,
      decision,
      from: kycCase.status,
      to: targetStatus,
      riskScore: kycCase.riskScore,
      reason,
      ...(decision === "APPROVE" ? { highRisk, highRiskThreshold } : {}),
    },
  });

  return success({ kycCase: updated });
}
