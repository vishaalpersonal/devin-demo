"use server";

import { revalidatePath } from "next/cache";
import { AuthError, requireSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { decideKycCase, type KycDecision } from "@/lib/services/kyc";
import { failure, type ActionResult } from "@/lib/validation";
import type { KycCase } from "@/app/generated/prisma/client";

export async function decideKycCaseAction(input: {
  caseId: string;
  decision: KycDecision;
  reason: string;
}): Promise<ActionResult<{ kycCase: KycCase }>> {
  const session = await requireSession().catch(() => null);
  if (!session) return failure("UNAUTHENTICATED", "No active session");
  try {
    const result = await decideKycCase(session.user, input);
    revalidatePath("/kyc");
    revalidatePath(`/kyc/${input.caseId}`);
    return result;
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.code === "FORBIDDEN") {
        await recordAuditEvent({
          actor: session.user,
          action: "kyc.decided",
          resourceType: "KycCase",
          resourceId: input.caseId,
          result: "DENIED",
          metadata: { error: e.message },
        });
      }
      return failure(e.code, e.message);
    }
    throw e;
  }
}
