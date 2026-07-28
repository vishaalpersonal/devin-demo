import "server-only";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/permissions/authorize";
import type { SessionUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { getLedgerProvider } from "@/lib/ledger";
import { getRuleInt, RULE_KEYS } from "@/lib/services/rules";
import {
  failure,
  refundApprovalSchema,
  refundIssueSchema,
  success,
  type ActionResult,
} from "@/lib/validation";
import type { Payment, Prisma } from "@/app/generated/prisma/client";

export type RefundIssueOutcome =
  | { kind: "issued"; ledgerRef: string; refundedCents: number; paymentStatus: string }
  | { kind: "pending_approval"; refundRequestId: string; requiredApprovers: number };

const REFUNDABLE_STATUSES = ["SETTLED", "PARTIALLY_REFUNDED"] as const;

function isRefundable(payment: Payment): boolean {
  return (REFUNDABLE_STATUSES as readonly string[]).includes(payment.status);
}

async function applyRefundToPayment(
  paymentId: string,
  amountCents: number,
): Promise<Payment> {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });
  const refundedCents = payment.refundedCents + amountCents;
  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      refundedCents,
      status: refundedCents >= payment.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED",
    },
  });
}

export async function issueRefund(
  user: SessionUser,
  input: unknown,
): Promise<ActionResult<RefundIssueOutcome>> {
  authorize(user, "refunds.issue");

  const parsed = refundIssueSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { paymentId, amountCents, reason, idempotencyKey } = parsed.data;

  const processed = await prisma.processedAction.findUnique({
    where: { idempotencyKey },
  });
  if (processed) {
    return processed.resultJson as unknown as ActionResult<RefundIssueOutcome>;
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return failure("NOT_FOUND", "Payment not found");
  if (!isRefundable(payment)) {
    return failure(
      "NOT_REFUNDABLE",
      `Payment is ${payment.status} and cannot be refunded`,
    );
  }
  if (amountCents + payment.refundedCents > payment.amountCents) {
    return failure(
      "OVER_REFUND",
      "Refund would exceed the remaining refundable amount",
    );
  }

  const maxSelfServeCents = await getRuleInt(RULE_KEYS.refundsMaxSelfServeCents);

  let result: ActionResult<RefundIssueOutcome>;

  if (amountCents > maxSelfServeCents) {
    const requiredApprovers = await getRuleInt(RULE_KEYS.refundsRequiredApprovers);
    const refundRequest = await prisma.refundRequest.create({
      data: {
        paymentId,
        requesterId: user.id,
        amountCents,
        reason,
        idempotencyKey,
      },
    });
    await recordAuditEvent({
      actor: user,
      action: "refund.requested",
      resourceType: "RefundRequest",
      resourceId: refundRequest.id,
      result: "SUCCESS",
      metadata: {
        paymentExternalId: payment.externalId,
        amountCents,
        reason,
        idempotencyKey,
        maxSelfServeCents,
        requiredApprovers,
      },
    });
    result = success({
      kind: "pending_approval",
      refundRequestId: refundRequest.id,
      requiredApprovers,
    });
  } else {
    const ledger = await getLedgerProvider().issueRefund({
      paymentExternalId: payment.externalId,
      amountCents,
      currency: payment.currency,
      idempotencyKey,
    });
    if (!ledger.ok) {
      await recordAuditEvent({
        actor: user,
        action: "refund.issued",
        resourceType: "Payment",
        resourceId: payment.id,
        result: "FAILURE",
        metadata: { amountCents, reason, idempotencyKey, error: ledger.error },
      });
      return failure("LEDGER_ERROR", ledger.error);
    }
    const updated = await applyRefundToPayment(paymentId, amountCents);
    await prisma.refundRequest.create({
      data: {
        paymentId,
        requesterId: user.id,
        amountCents,
        reason,
        status: "ISSUED",
        idempotencyKey,
        ledgerRef: ledger.ledgerRef,
      },
    });
    await recordAuditEvent({
      actor: user,
      action: "refund.issued",
      resourceType: "Payment",
      resourceId: payment.id,
      result: "SUCCESS",
      metadata: {
        paymentExternalId: payment.externalId,
        amountCents,
        ledgerRef: ledger.ledgerRef,
        reason,
        idempotencyKey,
      },
    });
    result = success({
      kind: "issued",
      ledgerRef: ledger.ledgerRef,
      refundedCents: updated.refundedCents,
      paymentStatus: updated.status,
    });
  }

  await prisma.processedAction.create({
    data: {
      idempotencyKey,
      action: "refund.issue",
      resultJson: result as unknown as Prisma.InputJsonValue,
    },
  });
  return result;
}

export async function decideRefund(
  user: SessionUser,
  input: unknown,
): Promise<ActionResult<{ status: string }>> {
  authorize(user, "refunds.approve");

  const parsed = refundApprovalSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { refundRequestId, approved, reason } = parsed.data;

  const refundRequest = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: { payment: true, approvals: true },
  });
  if (!refundRequest) return failure("NOT_FOUND", "Refund request not found");
  if (refundRequest.status !== "PENDING_APPROVAL") {
    return failure("INVALID_STATE", `Refund request is ${refundRequest.status}`);
  }
  if (refundRequest.requesterId === user.id) {
    await recordAuditEvent({
      actor: user,
      action: "refund.approval_denied",
      resourceType: "RefundRequest",
      resourceId: refundRequest.id,
      result: "DENIED",
      metadata: { rule: "maker-checker: requester may not approve own request" },
    });
    return failure("SELF_APPROVAL", "You cannot approve your own refund request");
  }
  if (refundRequest.approvals.some((a) => a.approverId === user.id)) {
    return failure("DUPLICATE", "You have already reviewed this request");
  }

  await prisma.refundApproval.create({
    data: {
      refundRequestId,
      approverId: user.id,
      approved,
      reason: reason ?? null,
    },
  });

  if (!approved) {
    await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: "REJECTED" },
    });
    await recordAuditEvent({
      actor: user,
      action: "refund.rejected",
      resourceType: "RefundRequest",
      resourceId: refundRequest.id,
      result: "SUCCESS",
      metadata: {
        paymentExternalId: refundRequest.payment.externalId,
        amountCents: refundRequest.amountCents,
        reason,
      },
    });
    return success({ status: "REJECTED" });
  }

  const requiredApprovers = await getRuleInt(RULE_KEYS.refundsRequiredApprovers);
  const approvalCount = refundRequest.approvals.filter((a) => a.approved).length + 1;

  await recordAuditEvent({
    actor: user,
    action: "refund.approved",
    resourceType: "RefundRequest",
    resourceId: refundRequest.id,
    result: "SUCCESS",
    metadata: {
      paymentExternalId: refundRequest.payment.externalId,
      amountCents: refundRequest.amountCents,
      approvals: approvalCount,
      requiredApprovers,
    },
  });

  if (approvalCount < requiredApprovers) {
    return success({ status: "PENDING_APPROVAL" });
  }

  const payment = refundRequest.payment;
  if (!isRefundable(payment)) {
    await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: "FAILED" },
    });
    return failure(
      "NOT_REFUNDABLE",
      `Payment is ${payment.status} and cannot be refunded`,
    );
  }
  if (refundRequest.amountCents + payment.refundedCents > payment.amountCents) {
    await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: "FAILED" },
    });
    return failure(
      "OVER_REFUND",
      "Refund would exceed the remaining refundable amount",
    );
  }

  const ledger = await getLedgerProvider().issueRefund({
    paymentExternalId: payment.externalId,
    amountCents: refundRequest.amountCents,
    currency: payment.currency,
    idempotencyKey: refundRequest.idempotencyKey,
  });
  if (!ledger.ok) {
    await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: "FAILED" },
    });
    await recordAuditEvent({
      actor: user,
      action: "refund.issued",
      resourceType: "Payment",
      resourceId: payment.id,
      result: "FAILURE",
      metadata: {
        amountCents: refundRequest.amountCents,
        refundRequestId,
        error: ledger.error,
      },
    });
    return failure("LEDGER_ERROR", ledger.error);
  }

  await applyRefundToPayment(payment.id, refundRequest.amountCents);
  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: { status: "ISSUED", ledgerRef: ledger.ledgerRef },
  });
  await recordAuditEvent({
    actor: user,
    action: "refund.issued",
    resourceType: "Payment",
    resourceId: payment.id,
    result: "SUCCESS",
    metadata: {
      paymentExternalId: payment.externalId,
      amountCents: refundRequest.amountCents,
      ledgerRef: ledger.ledgerRef,
      reason: refundRequest.reason,
      idempotencyKey: refundRequest.idempotencyKey,
      refundRequestId,
      approvals: approvalCount,
      requiredApprovers,
    },
  });
  return success({ status: "ISSUED" });
}
