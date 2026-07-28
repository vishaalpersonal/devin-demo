/**
 * Integration tests against the local docker-compose Postgres.
 * Requires `docker compose up -d` and `pnpm prisma migrate dev` first.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decideRefund, issueRefund } from "@/lib/services/refunds";
import { AuthError } from "@/lib/permissions/authorize";
import type { SessionUser } from "@/lib/auth";

const run = randomUUID().slice(0, 8);

let support: SessionUser;
let reviewer: SessionUser;
let reviewer2: SessionUser;
let admin: SessionUser;

async function createPayment(amountCents: number, refundedCents = 0) {
  return prisma.payment.create({
    data: {
      externalId: `test-pay-${run}-${randomUUID().slice(0, 8)}`,
      customerName: "T Customer",
      customerEmail: `customer-${run}@t.dev`,
      amountCents,
      refundedCents,
      status: refundedCents > 0 ? "PARTIALLY_REFUNDED" : "SETTLED",
    },
  });
}

beforeAll(async () => {
  const [s, r, r2, a] = await Promise.all([
    prisma.user.create({
      data: { email: `support-r-${run}@t.dev`, name: "T Support", role: "SUPPORT_AGENT" },
    }),
    prisma.user.create({
      data: {
        email: `reviewer-${run}@t.dev`,
        name: "T Reviewer",
        role: "COMPLIANCE_REVIEWER",
      },
    }),
    prisma.user.create({
      data: {
        email: `reviewer2-${run}@t.dev`,
        name: "T Reviewer 2",
        role: "COMPLIANCE_REVIEWER",
      },
    }),
    prisma.user.create({
      data: { email: `admin-r-${run}@t.dev`, name: "T Admin R", role: "ADMINISTRATOR" },
    }),
  ]);
  support = s;
  reviewer = r;
  reviewer2 = r2;
  admin = a;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("issueRefund", () => {
  it("rejects callers without refunds.issue server-side", async () => {
    const payment = await createPayment(10_00);
    await expect(
      issueRefund(reviewer, {
        paymentId: payment.id,
        amountCents: 5_00,
        reason: "reviewers cannot issue refunds",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow(AuthError);
  });

  it("rejects refunds that exceed the remaining refundable amount", async () => {
    const payment = await createPayment(10_00, 8_00);
    const result = await issueRefund(support, {
      paymentId: payment.id,
      amountCents: 3_00,
      reason: "over-refund should be rejected",
      idempotencyKey: randomUUID(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("OVER_REFUND");
  });

  it("rejects refunds on non-refundable payments", async () => {
    const payment = await prisma.payment.create({
      data: {
        externalId: `test-pay-${run}-failed`,
        customerName: "T Customer",
        customerEmail: `customer-${run}@t.dev`,
        amountCents: 10_00,
        status: "FAILED",
      },
    });
    const result = await issueRefund(support, {
      paymentId: payment.id,
      amountCents: 5_00,
      reason: "failed payments are not refundable",
      idempotencyKey: randomUUID(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_REFUNDABLE");
  });

  it("applies small refunds via the ledger and records an audit event", async () => {
    const payment = await createPayment(40_00);
    const key = randomUUID();
    const result = await issueRefund(support, {
      paymentId: payment.id,
      amountCents: 15_00,
      reason: "customer reported duplicate charge",
      idempotencyKey: key,
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data.kind !== "issued") throw new Error("expected issued");
    expect(result.data.ledgerRef).toMatch(/^mock_ledger_/);

    const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(updated?.refundedCents).toBe(15_00);
    expect(updated?.status).toBe("PARTIALLY_REFUNDED");

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "refund.issued", resourceId: payment.id },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(support.id);
    const metadata = audit?.metadata as Record<string, unknown>;
    expect(metadata.ledgerRef).toBe(result.data.ledgerRef);
    expect(metadata.idempotencyKey).toBe(key);
  });

  it("routes refunds above the self-serve limit through maker-checker", async () => {
    const payment = await createPayment(200_00);
    const result = await issueRefund(support, {
      paymentId: payment.id,
      amountCents: 100_00,
      reason: "large refund needs approval",
      idempotencyKey: randomUUID(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data.kind !== "pending_approval") {
      throw new Error("expected pending_approval");
    }

    const unchanged = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(unchanged?.refundedCents).toBe(0); // no money moved yet

    const request = await prisma.refundRequest.findUnique({
      where: { id: result.data.refundRequestId },
    });
    expect(request?.status).toBe("PENDING_APPROVAL");

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "refund.requested", resourceId: request?.id },
    });
    expect(audit).not.toBeNull();
  });

  it("returns the stored result on idempotent retry without double-refunding", async () => {
    const payment = await createPayment(30_00);
    const key = randomUUID();
    const input = {
      paymentId: payment.id,
      amountCents: 10_00,
      reason: "retry-safety demo refund",
      idempotencyKey: key,
    };
    const first = await issueRefund(support, input);
    expect(first.ok).toBe(true);
    if (!first.ok || first.data.kind !== "issued") throw new Error("expected issued");

    const retry = await issueRefund(support, input);
    expect(retry).toEqual(first);

    const after = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(after?.refundedCents).toBe(10_00); // no extra money moved

    const audits = await prisma.auditEvent.count({
      where: { action: "refund.issued", resourceId: payment.id },
    });
    expect(audits).toBe(1);
  });
});

describe("decideRefund", () => {
  async function createPendingRequest(amountCents = 100_00, requester?: SessionUser) {
    const payment = await createPayment(200_00);
    const result = await issueRefund(requester ?? support, {
      paymentId: payment.id,
      amountCents,
      reason: "large refund pending approval",
      idempotencyKey: randomUUID(),
    });
    if (!result.ok || result.data.kind !== "pending_approval") {
      throw new Error("expected pending_approval");
    }
    return { payment, refundRequestId: result.data.refundRequestId };
  }

  it("rejects self-approval and audits the attempt", async () => {
    // The requester needs refunds.approve for self-approval to be reachable,
    // so an administrator requests the refund and tries to approve it.
    const { refundRequestId } = await createPendingRequest(100_00, admin);
    const selfApproval = await decideRefund(admin, {
      refundRequestId,
      approved: true,
    });
    expect(selfApproval.ok).toBe(false);
    if (!selfApproval.ok) expect(selfApproval.error.code).toBe("SELF_APPROVAL");

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "refund.approval_denied", resourceId: refundRequestId },
    });
    expect(audit?.result).toBe("DENIED");
  });

  it("applies the refund when a distinct approver approves", async () => {
    const { payment, refundRequestId } = await createPendingRequest(100_00);
    const approval = await decideRefund(reviewer, {
      refundRequestId,
      approved: true,
    });
    expect(approval.ok).toBe(true);
    if (approval.ok) expect(approval.data.status).toBe("ISSUED");

    const applied = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(applied?.refundedCents).toBe(100_00);
    expect(applied?.status).toBe("PARTIALLY_REFUNDED");

    const request = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });
    expect(request?.status).toBe("ISSUED");
    expect(request?.ledgerRef).toMatch(/^mock_ledger_/);

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "refund.issued", resourceId: payment.id },
    });
    expect(audit?.actorId).toBe(reviewer.id);
  });

  it("waits for the configured approver count before moving money", async () => {
    await prisma.governanceRule.update({
      where: { key: "refunds.requiredApprovers" },
      data: { valueInt: 2 },
    });
    try {
      const { payment, refundRequestId } = await createPendingRequest(100_00);
      const first = await decideRefund(reviewer, { refundRequestId, approved: true });
      expect(first.ok).toBe(true);
      if (first.ok) expect(first.data.status).toBe("PENDING_APPROVAL");

      const untouched = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(untouched?.refundedCents).toBe(0);

      const second = await decideRefund(reviewer2, { refundRequestId, approved: true });
      expect(second.ok).toBe(true);
      if (second.ok) expect(second.data.status).toBe("ISSUED");

      const applied = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(applied?.refundedCents).toBe(100_00);
    } finally {
      await prisma.governanceRule.update({
        where: { key: "refunds.requiredApprovers" },
        data: { valueInt: 1 },
      });
    }
  });

  it("closes the request on rejection without moving money", async () => {
    const { payment, refundRequestId } = await createPendingRequest();
    const rejection = await decideRefund(reviewer, {
      refundRequestId,
      approved: false,
      reason: "not enough supporting evidence",
    });
    expect(rejection.ok).toBe(true);
    if (rejection.ok) expect(rejection.data.status).toBe("REJECTED");

    const request = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });
    expect(request?.status).toBe("REJECTED");

    const untouched = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(untouched?.refundedCents).toBe(0);

    const audit = await prisma.auditEvent.findFirst({
      where: { action: "refund.rejected", resourceId: refundRequestId },
    });
    expect(audit).not.toBeNull();
  });
});
