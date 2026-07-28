import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Payment } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}

export default async function RefundsPage() {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "refunds.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view payments.
      </p>
    );
  }
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Refunds Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Placeholder: the next iteration adds refund issuance through the
          ledger abstraction with idempotency keys, the
          refunds.maxSelfServeCents governance rule, and maker-checker
          approvals for large amounts.
        </p>
      </div>
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
        ]}
        rows={payments}
        rowKey={(p) => p.id}
        emptyMessage="No payments."
      />
    </div>
  );
}
