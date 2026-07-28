import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TabNav } from "@/components/shared/tab-nav";

export const dynamic = "force-dynamic";

const TYPES = ["all", "flags", "refunds", "kyc"] as const;
type ApprovalType = (typeof TYPES)[number];

type DecisionRow = {
  id: string;
  app: string;
  subject: string;
  change: string;
  requestedBy: string;
  decidedBy: string;
  status: string;
  updatedAt: Date;
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const type: ApprovalType = TYPES.includes(params.type as ApprovalType)
    ? (params.type as ApprovalType)
    : "all";

  const canFlags = hasPermission(session.user.role, "flags.read");
  const canRefunds = hasPermission(session.user.role, "refunds.read");
  const canKyc = hasPermission(session.user.role, "kyc.read");

  const wantFlags = canFlags && (type === "all" || type === "flags");
  const wantRefunds = canRefunds && (type === "all" || type === "refunds");
  const wantKyc = canKyc && (type === "all" || type === "kyc");

  const [flagRequests, refundRequests, kycDecisions] = await Promise.all([
    wantFlags
      ? prisma.flagChangeRequest.findMany({
          where: { status: { not: "PENDING_APPROVAL" } },
          include: {
            flag: true,
            requester: true,
            approvals: { include: { approver: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    wantRefunds
      ? prisma.refundRequest.findMany({
          where: { status: { not: "PENDING_APPROVAL" } },
          include: {
            payment: true,
            requester: true,
            approvals: { include: { approver: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    wantKyc
      ? prisma.kycCase.findMany({
          where: { status: { in: ["APPROVED", "REJECTED"] } },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const kycDeciders = new Map<string, string>();
  if (kycDecisions.length > 0) {
    const events = await prisma.auditEvent.findMany({
      where: {
        resourceType: "KycCase",
        resourceId: { in: kycDecisions.map((c) => c.id) },
        result: "SUCCESS",
      },
      orderBy: { createdAt: "asc" },
    });
    for (const e of events) kycDeciders.set(e.resourceId, e.actorName);
  }

  const rows: DecisionRow[] = [
    ...flagRequests.map((cr) => ({
      id: `flag-${cr.id}`,
      app: "Feature Flags",
      subject: `${cr.flag.key} (${cr.flag.environment.toLowerCase()})`,
      change: `${cr.targetState ? "enable" : "disable"} — “${cr.reason}”`,
      requestedBy: cr.requester.name,
      decidedBy:
        cr.approvals.map((a) => a.approver.name).join(", ") || "—",
      status: cr.status,
      updatedAt: cr.updatedAt,
    })),
    ...refundRequests.map((rr) => ({
      id: `refund-${rr.id}`,
      app: "Refunds",
      subject: rr.payment.externalId,
      change: `refund ${formatCents(rr.amountCents)} — “${rr.reason}”`,
      requestedBy: rr.requester.name,
      decidedBy:
        rr.approvals.map((a) => a.approver.name).join(", ") || "—",
      status: rr.status,
      updatedAt: rr.updatedAt,
    })),
    ...kycDecisions.map((c) => ({
      id: `kyc-${c.id}`,
      app: "KYC",
      subject: c.customerName,
      change: `case ${c.status.toLowerCase()}`,
      requestedBy: "—",
      decidedBy: kycDeciders.get(c.id) ?? "—",
      status: c.status,
      updatedAt: c.updatedAt,
    })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const tabs = [
    { href: "/approvals", label: "All" },
    ...(canFlags ? [{ href: "/approvals?type=flags", label: "Flag changes" }] : []),
    ...(canRefunds ? [{ href: "/approvals?type=refunds", label: "Refunds" }] : []),
    ...(canKyc ? [{ href: "/approvals?type=kyc", label: "KYC decisions" }] : []),
  ];
  const active =
    type === "all" ? "/approvals" : `/approvals?type=${type}`;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Decided Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Everything already approved, applied, issued, or rejected across all
          apps. Pending items live on their app pages.
        </p>
      </div>

      <TabNav tabs={tabs} active={active} />

      <DataTable<DecisionRow>
        columns={[
          { header: "App", cell: (r) => r.app },
          {
            header: "Subject",
            cell: (r) => <span className="font-mono text-xs">{r.subject}</span>,
          },
          { header: "Change", cell: (r) => r.change },
          { header: "Requested by", cell: (r) => r.requestedBy },
          { header: "Decided by", cell: (r) => r.decidedBy },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          {
            header: "Updated",
            cell: (r) => (
              <span className="font-mono text-xs">
                {r.updatedAt.toISOString().slice(0, 16).replace("T", " ")}
              </span>
            ),
          },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage="No decided approvals yet."
      />
    </div>
  );
}
