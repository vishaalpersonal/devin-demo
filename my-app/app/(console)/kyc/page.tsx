import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRuleInt, RULE_KEYS } from "@/lib/services/rules";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { KycFilters } from "@/components/kyc/kyc-filters";
import { KycDecisionActions } from "@/components/kyc/kyc-decision-actions";
import { KycStatus } from "@/app/generated/prisma/enums";
import type { KycCase } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUSES = Object.values(KycStatus);

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "kyc.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view KYC cases.
      </p>
    );
  }

  const { status } = await searchParams;
  const statusFilter = STATUSES.find((s) => s === status);

  const [cases, highRiskThreshold] = await Promise.all([
    prisma.kycCase.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      orderBy: [{ createdAt: "asc" }],
    }),
    getRuleInt(RULE_KEYS.kycHighRiskThreshold),
  ]);

  const canDecide = hasPermission(session.user.role, "kyc.decide");
  const isAdmin = session.user.role === "ADMINISTRATOR";

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">KYC Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          Approve, reject, or escalate customer verification cases. Decisions
          require a reason and are recorded in the audit log. Approving a case
          with risk score ≥ {highRiskThreshold} triggers an extra high-risk
          confirmation (governance rule kyc.highRiskThreshold).
        </p>
      </div>
      <KycFilters statuses={STATUSES} current={{ status: statusFilter }} />
      <DataTable<KycCase>
        columns={[
          {
            header: "Customer",
            cell: (c) => (
              <Link href={`/kyc/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                {c.customerName}
              </Link>
            ),
          },
          { header: "Email", cell: (c) => c.customerEmail },
          {
            header: "Risk score",
            cell: (c) => (
              <span
                className={
                  c.riskScore >= highRiskThreshold
                    ? "font-semibold text-red-600"
                    : undefined
                }
              >
                {c.riskScore}
              </span>
            ),
          },
          { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
          {
            header: "",
            cell: (c) => (
              <KycDecisionActions
                caseId={c.id}
                customerName={c.customerName}
                status={c.status}
                riskScore={c.riskScore}
                highRiskThreshold={highRiskThreshold}
                canDecide={canDecide}
                isAdmin={isAdmin}
              />
            ),
            className: "text-right",
          },
        ]}
        rows={cases}
        rowKey={(c) => c.id}
        emptyMessage="No KYC cases match the filter."
      />
    </div>
  );
}
