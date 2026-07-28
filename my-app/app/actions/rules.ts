"use server";

import { revalidatePath } from "next/cache";
import { AuthError, authorize, requireSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { failure, ruleUpdateSchema, success, type ActionResult } from "@/lib/validation";

export async function updateRuleAction(input: {
  key: string;
  valueInt?: number | null;
  valueBool?: boolean | null;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession().catch(() => null);
  if (!session) return failure("UNAUTHENTICATED", "No active session");

  try {
    authorize(session.user, "rules.write");
  } catch (e) {
    if (e instanceof AuthError) {
      await recordAuditEvent({
        actor: session.user,
        action: "rule.updated",
        resourceType: "GovernanceRule",
        resourceId: input.key,
        result: "DENIED",
        metadata: { error: e.message },
      });
      return failure(e.code, e.message);
    }
    throw e;
  }

  const parsed = ruleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await prisma.governanceRule.findUnique({
    where: { key: parsed.data.key },
  });
  if (!existing) return failure("NOT_FOUND", "Unknown rule");

  await prisma.governanceRule.update({
    where: { key: parsed.data.key },
    data: {
      valueInt: parsed.data.valueInt ?? existing.valueInt,
      valueBool: parsed.data.valueBool ?? existing.valueBool,
    },
  });
  await recordAuditEvent({
    actor: session.user,
    action: "rule.updated",
    resourceType: "GovernanceRule",
    resourceId: existing.key,
    result: "SUCCESS",
    metadata: {
      from: { valueInt: existing.valueInt, valueBool: existing.valueBool },
      to: { valueInt: parsed.data.valueInt, valueBool: parsed.data.valueBool },
    },
  });
  revalidatePath("/admin/rules");
  return success(undefined);
}
