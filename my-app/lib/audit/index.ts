import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import type { Prisma } from "@/app/generated/prisma/client";

export type AuditResult = "SUCCESS" | "DENIED" | "FAILURE";

export type AuditInput = {
  actor: SessionUser;
  action: string;
  resourceType: string;
  resourceId: string;
  result: AuditResult;
  metadata?: Prisma.InputJsonValue;
  correlationId?: string;
};

/**
 * Shared audit service. Every sensitive mutation calls this. The table is
 * append-only at the DB layer (restricted grants + trigger); this is a
 * prototype control, not a production tamper-evident audit system.
 */
export async function recordAuditEvent(input: AuditInput) {
  return prisma.auditEvent.create({
    data: {
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      result: input.result,
      metadata: input.metadata ?? {},
      correlationId: input.correlationId ?? randomUUID(),
    },
  });
}
