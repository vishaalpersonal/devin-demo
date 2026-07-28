import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRuleInt, RULE_KEYS } from "@/lib/services/rules";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { KycDecisionActions } from "@/components/kyc/kyc-decision-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuditEvent } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function KycCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "kyc.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view KYC cases.
      </p>
    );
  }

  const { id } = await params;
  const [kycCase, events, highRiskThreshold] = await Promise.all([
    prisma.kycCase.findUnique({ where: { id } }),
    prisma.auditEvent.findMany({
      where: { resourceType: "KycCase", resourceId: id },
      orderBy: { createdAt: "desc" },
    }),
    getRuleInt(RULE_KEYS.kycHighRiskThreshold),
  ]);
  if (!kycCase) notFound();

  const canDecide = hasPermission(session.user.role, "kyc.decide");
  const isAdmin = session.user.role === "ADMINISTRATOR";
  const highRisk = kycCase.riskScore >= highRiskThreshold;
  const decisions = events.filter(
    (e) => e.action === "kyc.decided" || e.action === "kyc.escalated",
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/kyc"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to queue
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{kycCase.customerName}</h1>
          <StatusBadge status={kycCase.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case details</CardTitle>
          <CardDescription>
            Full context for the verification decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Customer</div>
            <div>{kycCase.customerName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div>{kycCase.customerEmail}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Risk score</div>
            <div className={highRisk ? "font-semibold text-red-600" : undefined}>
              {kycCase.riskScore}
              {highRisk && (
                <span className="ml-2 text-xs">
                  (high risk — threshold {highRiskThreshold})
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Opened</div>
            <div className="font-mono text-xs">
              {kycCase.createdAt.toISOString().replace("T", " ").slice(0, 19)}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">Notes</div>
            <div>{kycCase.notes ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-md border px-4 py-3">
        <span className="text-sm font-medium">Decision</span>
        <KycDecisionActions
          caseId={kycCase.id}
          customerName={kycCase.customerName}
          status={kycCase.status}
          riskScore={kycCase.riskScore}
          highRiskThreshold={highRiskThreshold}
          canDecide={canDecide}
          isAdmin={isAdmin}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">
          Decision history &amp; audit events ({decisions.length} decision
          {decisions.length === 1 ? "" : "s"}, {events.length} event
          {events.length === 1 ? "" : "s"})
        </h2>
        <DataTable<AuditEvent>
          columns={[
            {
              header: "Time",
              cell: (e) => (
                <span className="whitespace-nowrap font-mono text-xs">
                  {e.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </span>
              ),
            },
            {
              header: "Actor",
              cell: (e) => (
                <span>
                  {e.actorName}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({e.actorRole.replaceAll("_", " ").toLowerCase()})
                  </span>
                </span>
              ),
            },
            {
              header: "Action",
              cell: (e) => <span className="font-mono text-xs">{e.action}</span>,
            },
            { header: "Result", cell: (e) => <StatusBadge status={e.result} /> },
            {
              header: "Metadata",
              cell: (e) => (
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    view
                  </summary>
                  <pre className="mt-1 max-w-xs overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(e.metadata, null, 2)}
                  </pre>
                </details>
              ),
            },
          ]}
          rows={events}
          rowKey={(e) => e.id}
          emptyMessage="No audit events for this case yet."
        />
      </div>
    </div>
  );
}
