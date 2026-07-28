import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRuleInt, RULE_KEYS } from "@/lib/services/rules";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentSearch } from "@/components/refunds/payment-search";
import { IssueRefundDialog } from "@/components/refunds/issue-refund-dialog";
import { RefundRequestActions } from "@/components/refunds/refund-request-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Payment } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

const REFUNDABLE_STATUSES = ["SETTLED", "PARTIALLY_REFUNDED"];

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "refunds.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view payments.
      </p>
    );
  }

  const { q } = await searchParams;
  const canIssue = hasPermission(session.user.role, "refunds.issue");
  const canApprove = hasPermission(session.user.role, "refunds.approve");

  const [payments, pending, maxSelfServeCents, requiredApprovers] =
    await Promise.all([
      prisma.payment.findMany({
        where: q
          ? {
              OR: [
                { externalId: { contains: q, mode: "insensitive" } },
                { customerName: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "asc" },
      }),
      prisma.refundRequest.findMany({
        where: { status: "PENDING_APPROVAL" },
        include: { payment: true, requester: true, approvals: true },
        orderBy: { createdAt: "desc" },
      }),
      getRuleInt(RULE_KEYS.refundsMaxSelfServeCents),
      getRuleInt(RULE_KEYS.refundsRequiredApprovers),
    ]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Refunds Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          All money movement goes through the ledger abstraction with
          idempotency keys. Refunds above{" "}
          {formatCents(maxSelfServeCents, "USD")} require maker-checker
          approval ({requiredApprovers} approver
          {requiredApprovers === 1 ? "" : "s"}).
        </p>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending refund requests</CardTitle>
            <CardDescription>
              Maker-checker: the requester cannot approve their own refund.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pending.map((rr) => (
              <div
                key={rr.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{rr.payment.externalId}</span>
                    <span className="font-medium">
                      {formatCents(rr.amountCents, rr.payment.currency)}
                    </span>
                    <StatusBadge status={rr.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Requested by {rr.requester.name}: “{rr.reason}” · approvals{" "}
                    {rr.approvals.filter((a) => a.approved).length}/
                    {requiredApprovers}
                  </span>
                </div>
                <RefundRequestActions
                  refundRequestId={rr.id}
                  paymentExternalId={rr.payment.externalId}
                  disabled={!canApprove}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PaymentSearch current={q ?? ""} />

      <DataTable<Payment>
        columns={[
          {
            header: "Payment",
            cell: (p) => <span className="font-mono text-xs">{p.externalId}</span>,
          },
          { header: "Customer", cell: (p) => p.customerName },
          {
            header: "Amount",
            cell: (p) => formatCents(p.amountCents, p.currency),
          },
          {
            header: "Refunded",
            cell: (p) => formatCents(p.refundedCents, p.currency),
          },
          { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
          {
            header: "",
            cell: (p) => (
              <IssueRefundDialog
                paymentId={p.id}
                paymentExternalId={p.externalId}
                currency={p.currency}
                remainingCents={
                  REFUNDABLE_STATUSES.includes(p.status)
                    ? p.amountCents - p.refundedCents
                    : 0
                }
                maxSelfServeCents={maxSelfServeCents}
                disabled={!canIssue}
              />
            ),
            className: "text-right",
          },
        ]}
        rows={payments}
        rowKey={(p) => p.id}
        emptyMessage="No payments match your search."
      />
    </div>
  );
}
