import "server-only";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/permissions/authorize";
import type { SessionUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { getFlagProvider, type FlagView } from "@/lib/flags/provider";
import { getRuleBool, getRuleInt, RULE_KEYS } from "@/lib/services/rules";
import {
  failure,
  flagApprovalSchema,
  flagChangeSchema,
  success,
  type ActionResult,
} from "@/lib/validation";

export type FlagChangeOutcome =
  | { kind: "applied"; flag: FlagView }
  | { kind: "pending_approval"; changeRequestId: string; requiredApprovers: number };

export async function requestFlagChange(
  user: SessionUser,
  input: unknown,
): Promise<ActionResult<FlagChangeOutcome>> {
  authorize(user, "flags.write");

  const parsed = flagChangeSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { flagId, targetState, reason } = parsed.data;

  const provider = getFlagProvider();
  const flag = await provider.getFlag(flagId);
  if (!flag) return failure("NOT_FOUND", "Flag not found");
  if (flag.enabled === targetState) {
    return failure("NO_OP", "Flag is already in the requested state");
  }

  const requireApproval =
    flag.environment === "PRODUCTION" &&
    (await getRuleBool(RULE_KEYS.flagsRequireApproval));

  if (requireApproval) {
    const requiredApprovers = await getRuleInt(RULE_KEYS.flagsRequiredApprovers);
    const changeRequest = await prisma.flagChangeRequest.create({
      data: {
        flagId,
        requesterId: user.id,
        targetState,
        reason,
      },
    });
    await recordAuditEvent({
      actor: user,
      action: "flag.change_requested",
      resourceType: "FeatureFlag",
      resourceId: flag.id,
      result: "SUCCESS",
      metadata: {
        key: flag.key,
        environment: flag.environment,
        from: flag.enabled,
        to: targetState,
        reason,
        changeRequestId: changeRequest.id,
        requiredApprovers,
      },
    });
    return success({
      kind: "pending_approval",
      changeRequestId: changeRequest.id,
      requiredApprovers,
    });
  }

  const updated = await provider.setFlag(flagId, targetState);
  await recordAuditEvent({
    actor: user,
    action: "flag.changed",
    resourceType: "FeatureFlag",
    resourceId: flag.id,
    result: "SUCCESS",
    metadata: {
      key: flag.key,
      environment: flag.environment,
      from: flag.enabled,
      to: targetState,
      reason,
    },
  });
  return success({ kind: "applied", flag: updated });
}

export async function decideFlagChange(
  user: SessionUser,
  input: unknown,
): Promise<ActionResult<{ status: string }>> {
  authorize(user, "flags.approve");

  const parsed = flagApprovalSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { changeRequestId, approved, reason } = parsed.data;

  const changeRequest = await prisma.flagChangeRequest.findUnique({
    where: { id: changeRequestId },
    include: { flag: true, approvals: true },
  });
  if (!changeRequest) return failure("NOT_FOUND", "Change request not found");
  if (changeRequest.status !== "PENDING_APPROVAL") {
    return failure("INVALID_STATE", `Change request is ${changeRequest.status}`);
  }
  if (changeRequest.requesterId === user.id) {
    await recordAuditEvent({
      actor: user,
      action: "flag.approval_denied",
      resourceType: "FlagChangeRequest",
      resourceId: changeRequest.id,
      result: "DENIED",
      metadata: { rule: "maker-checker: requester may not approve own request" },
    });
    return failure("SELF_APPROVAL", "You cannot approve your own change request");
  }
  if (changeRequest.approvals.some((a) => a.approverId === user.id)) {
    return failure("DUPLICATE", "You have already reviewed this request");
  }

  await prisma.flagApproval.create({
    data: {
      changeRequestId,
      approverId: user.id,
      approved,
      reason: reason ?? null,
    },
  });

  if (!approved) {
    await prisma.flagChangeRequest.update({
      where: { id: changeRequestId },
      data: { status: "REJECTED" },
    });
    await recordAuditEvent({
      actor: user,
      action: "flag.change_rejected",
      resourceType: "FlagChangeRequest",
      resourceId: changeRequest.id,
      result: "SUCCESS",
      metadata: { key: changeRequest.flag.key, reason },
    });
    return success({ status: "REJECTED" });
  }

  const requiredApprovers = await getRuleInt(RULE_KEYS.flagsRequiredApprovers);
  const approvalCount = changeRequest.approvals.filter((a) => a.approved).length + 1;

  if (approvalCount < requiredApprovers) {
    await recordAuditEvent({
      actor: user,
      action: "flag.change_approved",
      resourceType: "FlagChangeRequest",
      resourceId: changeRequest.id,
      result: "SUCCESS",
      metadata: {
        key: changeRequest.flag.key,
        approvals: approvalCount,
        requiredApprovers,
      },
    });
    return success({ status: "PENDING_APPROVAL" });
  }

  const provider = getFlagProvider();
  const updated = await provider.setFlag(
    changeRequest.flagId,
    changeRequest.targetState,
  );
  await prisma.flagChangeRequest.update({
    where: { id: changeRequestId },
    data: { status: "APPLIED" },
  });
  await recordAuditEvent({
    actor: user,
    action: "flag.change_applied",
    resourceType: "FeatureFlag",
    resourceId: changeRequest.flagId,
    result: "SUCCESS",
    metadata: {
      key: updated.key,
      environment: updated.environment,
      to: updated.enabled,
      changeRequestId,
      approvals: approvalCount,
      requiredApprovers,
    },
  });
  return success({ status: "APPLIED" });
}
