import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { KycCase } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "kyc.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view KYC cases.
      </p>
    );
  }
  const cases = await prisma.kycCase.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">KYC Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          Placeholder: the next iteration adds approve / reject / escalate
          decisions through the same authorize → validate → domain service →
          audit pipeline used by feature flags.
        </p>
      </div>
      <DataTable<KycCase>
        columns={[
          { header: "Customer", cell: (c) => c.customerName },
          { header: "Email", cell: (c) => c.customerEmail },
          { header: "Risk score", cell: (c) => c.riskScore },
          { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
          { header: "Notes", cell: (c) => c.notes ?? "—" },
        ]}
        rows={cases}
        rowKey={(c) => c.id}
        emptyMessage="No KYC cases."
      />
    </div>
  );
}
