/**
 * Integration tests against the local docker-compose Postgres.
 * Requires `docker compose up -d` and `pnpm prisma migrate dev` first.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decideFlagChange, requestFlagChange } from "@/lib/services/flags";
import { AuthError } from "@/lib/permissions/authorize";
import type { SessionUser } from "@/lib/auth";

const run = randomUUID().slice(0, 8);

let admin: SessionUser;
let admin2: SessionUser;
let support: SessionUser;
let prodFlagId: string;
let stagingFlagId: string;

beforeAll(async () => {
  const [a, b, s] = await Promise.all([
    prisma.user.create({
      data: { email: `admin-${run}@t.dev`, name: "T Admin", role: "ADMINISTRATOR" },
    }),
    prisma.user.create({
      data: { email: `admin2-${run}@t.dev`, name: "T Admin 2", role: "ADMINISTRATOR" },
    }),
    prisma.user.create({
      data: { email: `support-${run}@t.dev`, name: "T Support", role: "SUPPORT_AGENT" },
    }),
  ]);
  admin = a;
  admin2 = b;
  support = s;
  const prod = await prisma.featureFlag.create({
    data: {
      key: `test-flag-${run}`,
      environment: "PRODUCTION",
      description: "test",
      enabled: false,
    },
  });
  const staging = await prisma.featureFlag.create({
    data: {
      key: `test-flag-${run}`,
      environment: "STAGING",
      description: "test",
      enabled: false,
    },
  });
  prodFlagId = prod.id;
  stagingFlagId = staging.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("requestFlagChange", () => {
  it("rejects callers without flags.write server-side", async () => {
    await expect(
      requestFlagChange(support, {
        flagId: stagingFlagId,
        targetState: true,
        reason: "support should not be able to do this",
      }),
    ).rejects.toThrow(AuthError);
  });

  it("returns structured validation errors", async () => {
    const result = await requestFlagChange(admin, {
      flagId: stagingFlagId,
      targetState: true,
      reason: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION");
  });

  it("applies non-production changes immediately and records an audit event", async () => {
    const result = await requestFlagChange(admin, {
      flagId: stagingFlagId,
      targetState: true,
      reason: "enable staging flag for integration test",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.kind).toBe("applied");

    const flag = await prisma.featureFlag.findUnique({ where: { id: stagingFlagId } });
    expect(flag?.enabled).toBe(true);

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "flag.changed", resourceId: stagingFlagId },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(admin.id);
  });

  it("routes production changes through maker-checker", async () => {
    const result = await requestFlagChange(admin, {
      flagId: prodFlagId,
      targetState: true,
      reason: "enable production flag for integration test",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data.kind !== "pending_approval") {
      throw new Error("expected pending_approval");
    }

    const flag = await prisma.featureFlag.findUnique({ where: { id: prodFlagId } });
    expect(flag?.enabled).toBe(false); // not applied yet

    // Requester cannot approve their own change.
    const selfApproval = await decideFlagChange(admin, {
      changeRequestId: result.data.changeRequestId,
      approved: true,
    });
    expect(selfApproval.ok).toBe(false);
    if (!selfApproval.ok) expect(selfApproval.error.code).toBe("SELF_APPROVAL");

    // A second admin approves; the change applies and is audited.
    const approval = await decideFlagChange(admin2, {
      changeRequestId: result.data.changeRequestId,
      approved: true,
    });
    expect(approval.ok).toBe(true);
    if (approval.ok) expect(approval.data.status).toBe("APPLIED");

    const applied = await prisma.featureFlag.findUnique({ where: { id: prodFlagId } });
    expect(applied?.enabled).toBe(true);

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "flag.change_applied", resourceId: prodFlagId },
    });
    expect(audit?.actorId).toBe(admin2.id);
  });
});

describe("audit_events append-only", () => {
  it("rejects UPDATE and DELETE at the database layer", async () => {
    const event = await prisma.auditEvent.findFirstOrThrow();
    await expect(
      prisma.auditEvent.update({
        where: { id: event.id },
        data: { result: "TAMPERED" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.auditEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow();
  });
});
