"use server";

import { revalidatePath } from "next/cache";
import { AuthError, requireSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { decideRefund, issueRefund } from "@/lib/services/refunds";
import { failure, type ActionResult } from "@/lib/validation";
import type { RefundIssueOutcome } from "@/lib/services/refunds";

async function handleAuthError(
  e: unknown,
  action: string,
  resourceType: string,
  resourceId: string,
): Promise<ActionResult<never>> {
  if (e instanceof AuthError) {
    if (e.code === "FORBIDDEN") {
      const session = await requireSession().catch(() => null);
      if (session) {
        await recordAuditEvent({
          actor: session.user,
          action,
          resourceType,
          resourceId,
          result: "DENIED",
          metadata: { error: e.message },
        });
      }
    }
    return failure(e.code, e.message);
  }
  throw e;
}

export async function issueRefundAction(input: {
  paymentId: string;
  amountCents: number;
  reason: string;
  idempotencyKey: string;
}): Promise<ActionResult<RefundIssueOutcome>> {
  const session = await requireSession().catch(() => null);
  if (!session) return failure("UNAUTHENTICATED", "No active session");
  try {
    const result = await issueRefund(session.user, input);
    revalidatePath("/refunds");
    return result;
  } catch (e) {
    return handleAuthError(e, "refund.requested", "Payment", input.paymentId);
  }
}

export async function decideRefundAction(input: {
  refundRequestId: string;
  approved: boolean;
  reason?: string;
}): Promise<ActionResult<{ status: string }>> {
  const session = await requireSession().catch(() => null);
  if (!session) return failure("UNAUTHENTICATED", "No active session");
  try {
    const result = await decideRefund(session.user, input);
    revalidatePath("/refunds");
    return result;
  } catch (e) {
    return handleAuthError(
      e,
      "refund.approval_denied",
      "RefundRequest",
      input.refundRequestId,
    );
  }
}
