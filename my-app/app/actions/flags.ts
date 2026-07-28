"use server";

import { revalidatePath } from "next/cache";
import { AuthError, requireSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { decideFlagChange, requestFlagChange } from "@/lib/services/flags";
import { failure, type ActionResult } from "@/lib/validation";
import type { FlagChangeOutcome } from "@/lib/services/flags";

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

export async function requestFlagChangeAction(input: {
  flagId: string;
  targetState: boolean;
  reason: string;
}): Promise<ActionResult<FlagChangeOutcome>> {
  const session = await requireSession().catch(() => null);
  if (!session) return failure("UNAUTHENTICATED", "No active session");
  try {
    const result = await requestFlagChange(session.user, input);
    revalidatePath("/feature-flags");
    return result;
  } catch (e) {
    return handleAuthError(e, "flag.change_requested", "FeatureFlag", input.flagId);
  }
}

export async function decideFlagChangeAction(input: {
  changeRequestId: string;
  approved: boolean;
  reason?: string;
}): Promise<ActionResult<{ status: string }>> {
  const session = await requireSession().catch(() => null);
  if (!session) return failure("UNAUTHENTICATED", "No active session");
  try {
    const result = await decideFlagChange(session.user, input);
    revalidatePath("/feature-flags");
    return result;
  } catch (e) {
    return handleAuthError(
      e,
      "flag.change_decided",
      "FlagChangeRequest",
      input.changeRequestId,
    );
  }
}
